#!/usr/bin/env bash
# Surveillance du serveur K-Kouma : disque, mémoire, charge, température,
# processus PM2, MySQL, nginx, site en ligne, certificat HTTPS, sauvegardes.
# Les alertes partent sur Telegram aux admins qui ont relié leur compte dans
# l'application (Mon compte), avec le même bot (TELEGRAM_BOT_TOKEN du .env).
#
# Usage, depuis n'importe quel dossier :
#   scripts/monitor-server.sh            vérifie et alerte (cron, toutes les 5 minutes)
#   scripts/monitor-server.sh --report   envoie l'état complet du serveur (cron, chaque matin)
#   scripts/monitor-server.sh --test     envoie un message de test
#   ajouter --dry-run pour afficher les messages au lieu de les envoyer
#
# Une alerte n'est envoyée qu'au début d'un problème, rappelée toutes les
# REMIND_HOURS heures tant qu'il dure, puis un message signale le retour à
# la normale : pas de message toutes les 5 minutes.
set -uo pipefail

# ---------------------------------------------------------------- réglages
ENV_FILE="${ENV_FILE:-$HOME/kkouman-prod/.env}"
STATE_DIR="${STATE_DIR:-$HOME/.kkouma-monitor}"
SITE_URL="${SITE_URL:-https://k-kouma.com}"
LOCAL_URLS="${LOCAL_URLS-http://127.0.0.1:3000/login http://127.0.0.1:3001/login}"
PM2_APPS="${PM2_APPS-kkouman-prod kkouman-test}"
SERVICES="${SERVICES-nginx mysql}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/kkouma}"

DISK_WARN="${DISK_WARN:-85}"          # % d'espace disque utilisé
MEM_MIN_FREE="${MEM_MIN_FREE:-10}"    # % de mémoire encore disponible
SWAP_WARN="${SWAP_WARN:-60}"          # % de swap utilisé
LOAD_FACTOR="${LOAD_FACTOR:-2}"       # charge moyenne sur 5 min, par cœur
TEMP_WARN="${TEMP_WARN:-80}"          # °C
CERT_MIN_DAYS="${CERT_MIN_DAYS:-14}"
BACKUP_MAX_HOURS="${BACKUP_MAX_HOURS:-26}"
PM2_RESTART_BURST="${PM2_RESTART_BURST:-3}"  # redémarrages entre deux passages = plantages en boucle
REMIND_HOURS="${REMIND_HOURS:-6}"

MODE="check"
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --report) MODE="report" ;;
    --test) MODE="test" ;;
    --dry-run) DRY_RUN=1 ;;
    *) echo "Option inconnue : $arg" >&2; exit 2 ;;
  esac
done

HOST="$(hostname)"
NOW="$(date +%s)"
mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"

# Deux passages simultanés (cron lent) enverraient deux fois la même alerte.
exec 9>"$STATE_DIR/.lock"
if ! flock -n 9; then
  echo "Une vérification est déjà en cours." >&2
  exit 0
fi

# ---------------------------------------------------------------- outils
# Valeur d'une variable du .env, sans les guillemets (droits ou typographiques)
# ni les espaces qu'un copier-coller laisse parfois autour.
env_value() {
  [ -r "$ENV_FILE" ] || return 0
  grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- |
    sed -E -e 's/^[[:space:]]+|[[:space:]]+$//g' -e "s/^[\"'“”]+//" -e "s/[\"'“”]+$//"
}

TOKEN="${TELEGRAM_BOT_TOKEN:-$(env_value TELEGRAM_BOT_TOKEN)}"
FIXED_CHAT_ID="${TELEGRAM_CHAT_ID:-$(env_value TELEGRAM_CHAT_ID)}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-$(env_value HEALTHCHECK_URL)}"
TELEGRAM_API_URL="${TELEGRAM_API_URL:-https://api.telegram.org}"  # modifiable pour les tests

esc() {
  local s="$1"
  s="${s//&/&amp;}"; s="${s//</&lt;}"; s="${s//>/&gt;}"
  printf '%s' "$s"
}

find_node() {
  local candidate
  candidate="$(command -v node 2>/dev/null)"
  # cron n'hérite pas du PATH de nvm.
  [ -n "$candidate" ] || candidate="$(ls -1d "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -1)"
  printf '%s' "$candidate"
}

# Destinataires : les admins qui ont relié leur Telegram dans l'application
# (/admin/compte), plus TELEGRAM_CHAT_ID s'il est renseigné. La liste est
# gardée en cache : si MySQL est justement en panne, les alertes partent quand
# même aux derniers destinataires connus.
RECIPIENTS=""
RECIPIENTS_LOADED=0
load_recipients() {
  [ "$RECIPIENTS_LOADED" = 1 ] && return
  RECIPIENTS_LOADED=1
  local cache="$STATE_DIR/recipients" node raw_url parsed host port user database password ids=""
  node="$(find_node)"
  raw_url="$(env_value DATABASE_URL)"
  if [ -n "$node" ] && [ -n "$raw_url" ] && command -v mysql >/dev/null 2>&1; then
    parsed="$(DB_URL="$raw_url" "$node" -e '
      const u = new URL(process.env.DB_URL);
      const host = u.hostname === "localhost" ? "127.0.0.1" : u.hostname;
      console.log([host, u.port || "3306", decodeURIComponent(u.username), u.pathname.slice(1)].join("\n"));
      console.log(decodeURIComponent(u.password));
    ' 2>/dev/null)"
    if [ -n "$parsed" ]; then
      { read -r host; read -r port; read -r user; read -r database; IFS= read -r password || true; } <<< "$parsed"
      # MYSQL_PWD évite d'exposer le mot de passe dans la liste des processus.
      if ids="$(MYSQL_PWD="$password" mysql -N -B --connect-timeout=5 -h "$host" -P "$port" -u "$user" "$database" \
        -e "SELECT telegram_chat_id FROM users WHERE role='admin' AND status='active' AND telegram_chat_id IS NOT NULL" 2>/dev/null)"; then
        printf '%s\n' "$ids" | grep -E '^-?[0-9]{1,20}$' > "$cache.tmp" && mv "$cache.tmp" "$cache" || : > "$cache"
      fi
    fi
  fi
  [ -r "$cache" ] && RECIPIENTS="$(cat "$cache")"
  if [[ "$FIXED_CHAT_ID" =~ ^-?[0-9]{1,20}$ ]]; then
    RECIPIENTS="$(printf '%s\n%s\n' "$RECIPIENTS" "$FIXED_CHAT_ID")"
  fi
  RECIPIENTS="$(printf '%s\n' "$RECIPIENTS" | grep -E '^-?[0-9]+$' | sort -u)"
}

send() {
  local text="$1" chat sent=0
  if [ "$DRY_RUN" = 1 ]; then
    printf -- '----- message Telegram -----\n%s\n' "$text"
    return 0
  fi
  load_recipients
  if [ -z "$TOKEN" ] || [ -z "$RECIPIENTS" ]; then
    echo "Telegram : pas de jeton ou aucun admin relié (Mon compte > Alertes sur Telegram). Message : $text" >&2
    return 1
  fi
  for chat in $RECIPIENTS; do
    # Le jeton passe par l'entrée standard de curl, jamais en argument : il
    # serait sinon visible dans la liste des processus.
    if printf 'url = "%s/bot%s/sendMessage"\n' "$TELEGRAM_API_URL" "$TOKEN" |
      curl -sS --fail --max-time 15 -o /dev/null -K - \
        --data-urlencode "chat_id=$chat" \
        --data-urlencode "text=$text" \
        --data-urlencode "parse_mode=HTML" \
        --data-urlencode "disable_web_page_preview=true"; then
      sent=$((sent + 1))
    fi
  done
  [ "$sent" -gt 0 ] || { echo "Envoi Telegram échoué." >&2; return 1; }
}

ALERTS=()      # problèmes en cours (pour le rapport)
SUMMARY=()     # état mesuré (pour le rapport)

# Retient l'état d'une vérification et n'écrit qu'aux changements.
#   record <clé> ok|alert "<message>"
record() {
  local key="$1" status="$2" message="$3"
  local file="$STATE_DIR/$key.state"
  if [ "$status" = "alert" ]; then
    ALERTS+=("$message")
    [ "$MODE" = "check" ] || return 0
    if [ ! -f "$file" ]; then
      send "⚠️ <b>K-Kouma · $(esc "$HOST")</b>
$(esc "$message")" && printf '%s %s\n' "$NOW" "$NOW" > "$file"
    else
      local since last
      read -r since last < "$file"
      if [ $((NOW - last)) -ge $((REMIND_HOURS * 3600)) ]; then
        local hours=$(((NOW - since) / 3600))
        send "⏳ <b>K-Kouma · $(esc "$HOST")</b> · toujours en cours depuis ${hours} h
$(esc "$message")" && printf '%s %s\n' "$since" "$NOW" > "$file"
      fi
    fi
  else
    [ "$MODE" = "check" ] || return 0
    if [ -f "$file" ]; then
      send "✅ <b>K-Kouma · $(esc "$HOST")</b> · retour à la normale
$(esc "$message")" && rm -f "$file"
    fi
  fi
}

# ---------------------------------------------------------------- vérifications
check_disk() {
  local line use mount iuse key
  while read -r line; do
    use="$(awk '{print $5}' <<< "$line" | tr -d '%')"
    mount="$(awk '{print $6}' <<< "$line")"
    key="disk$(tr '/' '_' <<< "$mount")"
    SUMMARY+=("Disque $mount : ${use} % utilisé")
    if [ "$use" -ge "$DISK_WARN" ]; then
      record "$key" alert "Disque $mount presque plein : ${use} % utilisé (seuil ${DISK_WARN} %)."
    else
      record "$key" ok "Disque $mount : ${use} % utilisé."
    fi
  done < <(df -P -x tmpfs -x devtmpfs -x squashfs -x overlay -x efivarfs 2>/dev/null | tail -n +2)

  # Un disque peut être « plein » faute d'inodes alors qu'il reste de la place.
  while read -r line; do
    iuse="$(awk '{print $5}' <<< "$line" | tr -d '%')"
    mount="$(awk '{print $6}' <<< "$line")"
    [ "$iuse" = "-" ] && continue
    key="inodes$(tr '/' '_' <<< "$mount")"
    if [ "$iuse" -ge "$DISK_WARN" ]; then
      record "$key" alert "Disque $mount : ${iuse} % des inodes utilisés (trop de petits fichiers)."
    else
      record "$key" ok "Disque $mount : inodes à ${iuse} %."
    fi
  done < <(df -Pi -x tmpfs -x devtmpfs -x squashfs -x overlay -x efivarfs 2>/dev/null | tail -n +2)
}

check_memory() {
  local total avail swap_total swap_free free_pct swap_pct
  total="$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)"
  avail="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
  swap_total="$(awk '/^SwapTotal:/ {print $2}' /proc/meminfo)"
  swap_free="$(awk '/^SwapFree:/ {print $2}' /proc/meminfo)"
  free_pct=$((avail * 100 / total))
  SUMMARY+=("Mémoire : $((avail / 1024)) Mo disponibles sur $((total / 1024)) Mo (${free_pct} %)")
  if [ "$free_pct" -lt "$MEM_MIN_FREE" ]; then
    record memory alert "Mémoire presque saturée : ${free_pct} % disponible ($((avail / 1024)) Mo)."
  else
    record memory ok "Mémoire : ${free_pct} % disponible."
  fi

  if [ "$swap_total" -gt 0 ]; then
    swap_pct=$(((swap_total - swap_free) * 100 / swap_total))
    SUMMARY+=("Swap : ${swap_pct} % utilisé")
    if [ "$swap_pct" -ge "$SWAP_WARN" ]; then
      record swap alert "Swap utilisé à ${swap_pct} % : le serveur manque de mémoire et ralentit."
    else
      record swap ok "Swap : ${swap_pct} % utilisé."
    fi
  fi
}

check_load() {
  local cores load5 limit
  cores="$(nproc)"
  load5="$(awk '{print $2}' /proc/loadavg)"
  limit=$((cores * LOAD_FACTOR))
  SUMMARY+=("Charge processeur (5 min) : ${load5} pour ${cores} cœur(s)")
  if awk -v l="$load5" -v m="$limit" 'BEGIN { exit !(l > m) }'; then
    record load alert "Processeur surchargé : charge ${load5} sur 5 min pour ${cores} cœur(s)."
  else
    record load ok "Charge processeur revenue à ${load5}."
  fi
}

check_temperature() {
  local max=0 value f
  for f in /sys/class/thermal/thermal_zone*/temp /sys/class/hwmon/hwmon*/temp*_input; do
    [ -r "$f" ] || continue
    value="$(cat "$f" 2>/dev/null)" || continue
    [[ "$value" =~ ^[0-9]+$ ]] || continue
    value=$((value / 1000))
    [ "$value" -gt "$max" ] && max="$value"
  done
  if [ "$max" -eq 0 ]; then
    # Cas habituel d'un VPS : l'hébergeur ne donne pas accès aux capteurs.
    SUMMARY+=("Température : non mesurable sur ce serveur (virtuel)")
    return
  fi
  SUMMARY+=("Température : ${max} °C")
  if [ "$max" -ge "$TEMP_WARN" ]; then
    record temperature alert "Température élevée : ${max} °C (seuil ${TEMP_WARN} °C)."
  else
    record temperature ok "Température revenue à ${max} °C."
  fi
}

find_pm2() {
  local candidate
  candidate="$(command -v pm2 2>/dev/null)"
  if [ -z "$candidate" ]; then
    # cron n'hérite pas du PATH de nvm.
    candidate="$(ls -1d "$HOME"/.nvm/versions/node/*/bin/pm2 2>/dev/null | sort -V | tail -1)"
  fi
  printf '%s' "$candidate"
}

check_pm2() {
  [ -n "$PM2_APPS" ] || return 0
  local pm2 node json app line status restarts previous file
  pm2="$(find_pm2)"
  if [ -z "$pm2" ]; then
    record pm2 alert "PM2 introuvable : impossible de vérifier l'application."
    return
  fi
  node="$(dirname "$pm2")/node"
  [ -x "$node" ] || node="$(command -v node)"
  json="$("$pm2" jlist 2>/dev/null)" || json="[]"
  for app in $PM2_APPS; do
    line="$(PM2_JSON="$json" APP="$app" "$node" -e '
      let list = [];
      try { list = JSON.parse(process.env.PM2_JSON); } catch {}
      const p = list.find((x) => x.name === process.env.APP);
      console.log(p ? `${p.pm2_env.status} ${p.pm2_env.restart_time}` : "absent 0");
    ' 2>/dev/null)" || line="inconnu 0"
    read -r status restarts <<< "$line"
    SUMMARY+=("Application $app : $status")
    if [ "$status" != "online" ]; then
      record "pm2-$app" alert "Application $app arrêtée (état PM2 : $status). Le site est probablement inaccessible."
    else
      record "pm2-$app" ok "Application $app de nouveau en ligne."
    fi
    # Un redémarrage isolé (déploiement) est normal ; plusieurs en 5 minutes = plantages en boucle.
    file="$STATE_DIR/pm2-$app.restarts"
    previous="$(cat "$file" 2>/dev/null || echo "$restarts")"
    if [[ "$restarts" =~ ^[0-9]+$ ]] && [[ "$previous" =~ ^[0-9]+$ ]] && [ "$MODE" = "check" ]; then
      if [ $((restarts - previous)) -ge "$PM2_RESTART_BURST" ]; then
        send "⚠️ <b>K-Kouma · $(esc "$HOST")</b>
$(esc "Application $app : $((restarts - previous)) redémarrages en quelques minutes, elle plante en boucle. Voir : pm2 logs $app")"
      fi
      printf '%s\n' "$restarts" > "$file"
    fi
  done
}

check_services() {
  local svc unit found
  for svc in $SERVICES; do
    found=""
    for unit in "$svc" $([ "$svc" = mysql ] && echo mariadb mysqld); do
      if systemctl list-unit-files "$unit.service" --no-legend 2>/dev/null | grep -q .; then found="$unit"; break; fi
    done
    if [ -z "$found" ]; then
      SUMMARY+=("Service $svc : non trouvé sur ce serveur")
      continue
    fi
    if systemctl is-active --quiet "$found"; then
      SUMMARY+=("Service $found : actif")
      record "svc-$svc" ok "Service $found de nouveau actif."
    else
      record "svc-$svc" alert "Service $found arrêté ($(systemctl is-active "$found" 2>/dev/null))."
    fi
  done
}

check_http() {
  local url result code time key
  for url in $SITE_URL $LOCAL_URLS; do
    key="http-$(printf '%s' "$url" | tr -c 'A-Za-z0-9' '_')"
    result="$(curl -sS -o /dev/null -w '%{http_code} %{time_total}' --max-time 20 "$url" 2>/dev/null)" || result="000 0"
    read -r code time <<< "$result"
    SUMMARY+=("$url : HTTP $code en $(LC_ALL=C printf '%.1f' "$time") s")
    if [[ "$code" =~ ^[23] ]]; then
      record "$key" ok "$url répond de nouveau (HTTP $code)."
    else
      record "$key" alert "$url ne répond pas correctement (HTTP $code)."
    fi
  done
}

check_certificate() {
  local host end end_ts days
  host="$(sed -E 's#^https://([^/:]+).*#\1#' <<< "$SITE_URL")"
  [[ "$SITE_URL" == https://* ]] || return 0
  end="$(echo | timeout 15 openssl s_client -servername "$host" -connect "$host:443" 2>/dev/null |
    openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
  if [ -z "$end" ]; then
    record cert alert "Certificat HTTPS de $host illisible : le site est peut-être inaccessible."
    return
  fi
  end_ts="$(date -d "$end" +%s 2>/dev/null)" || return 0
  days=$(((end_ts - NOW) / 86400))
  SUMMARY+=("Certificat HTTPS : expire dans ${days} jours")
  if [ "$days" -lt "$CERT_MIN_DAYS" ]; then
    record cert alert "Le certificat HTTPS de $host expire dans ${days} jours : vérifiez le renouvellement (certbot renew)."
  else
    record cert ok "Certificat HTTPS de $host renouvelé (${days} jours restants)."
  fi
}

check_backups() {
  local newest age
  newest="$(find "$BACKUP_DIR" -maxdepth 1 -name '*.sql.gz' -type f -printf '%T@\n' 2>/dev/null | sort -n | tail -1)"
  if [ -z "$newest" ]; then
    record backup alert "Aucune sauvegarde trouvée dans $BACKUP_DIR."
    return
  fi
  age=$(((NOW - ${newest%.*}) / 3600))
  SUMMARY+=("Dernière sauvegarde : il y a ${age} h")
  if [ "$age" -gt "$BACKUP_MAX_HOURS" ]; then
    record backup alert "Dernière sauvegarde de la base il y a ${age} h : la sauvegarde de nuit ne tourne plus."
  else
    record backup ok "Sauvegardes de nouveau à jour (il y a ${age} h)."
  fi
}

# ---------------------------------------------------------------- exécution
if [ "$MODE" = "test" ]; then
  send "🔔 <b>K-Kouma · $(esc "$HOST")</b>
Message de test de la surveillance du serveur." && echo "Message de test envoyé."
  exit $?
fi

check_disk
check_memory
check_load
check_temperature
check_pm2
check_services
check_http
check_certificate
check_backups

if [ "$MODE" = "report" ]; then
  report="📊 <b>K-Kouma · $(esc "$HOST")</b> · état du $(date '+%d/%m/%Y à %H:%M')"
  if [ "${#ALERTS[@]}" -eq 0 ]; then
    report+=$'\n'"✅ Aucun problème en cours."
  else
    report+=$'\n'"⚠️ ${#ALERTS[@]} problème(s) en cours :"
    for a in "${ALERTS[@]}"; do report+=$'\n'"• $(esc "$a")"; done
  fi
  report+=$'\n'
  for s in "${SUMMARY[@]}"; do report+=$'\n'"$(esc "$s")"; done
  up="$(cut -d. -f1 /proc/uptime)"
  report+=$'\n'"Serveur allumé depuis $((up / 86400)) j $((up % 86400 / 3600)) h"
  send "$report"
fi

# Signal de vie vers un service externe (ex. healthchecks.io) : s'il cesse,
# c'est que le serveur lui-même est tombé, ce que ce script ne peut pas dire.
if [ "$MODE" = "check" ] && [ -n "$HEALTHCHECK_URL" ] && [ "$DRY_RUN" = 0 ]; then
  curl -fsS --max-time 10 --retry 2 -o /dev/null "$HEALTHCHECK_URL" || echo "Signal de vie non transmis." >&2
fi
exit 0
