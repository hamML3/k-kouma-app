#!/usr/bin/env bash
# Sauvegarde MySQL d'une instance K-Kouma. Usage, depuis le dossier de l'app :
#   scripts/backup-mysql.sh [dossier_de_sauvegarde] [jours_de_conservation]
set -euo pipefail

BACKUP_DIR="${1:-$HOME/backups/kkouma}"
KEEP_DAYS="${2:-14}"
ENV_FILE="${ENV_FILE:-.env}"

raw_url="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
if [ -z "$raw_url" ]; then
  echo "DATABASE_URL introuvable dans $ENV_FILE" >&2
  exit 1
fi

# Node décode correctement les mots de passe encodés dans l'URL.
parsed="$(DB_URL="$raw_url" node -e '
  const u = new URL(process.env.DB_URL);
  const host = u.hostname === "localhost" ? "127.0.0.1" : u.hostname;
  console.log([host, u.port || "3306", decodeURIComponent(u.username), u.pathname.slice(1)].join("\n"));
  console.log(decodeURIComponent(u.password));
')"
{ read -r host; read -r port; read -r user; read -r database; IFS= read -r password || true; } <<< "$parsed"

# Les sauvegardes contiennent des données de santé : lisibles par ce seul compte.
umask 077
mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/${database}_$(date +%Y%m%d_%H%M%S).sql.gz"
tmp="$file.part"
trap 'rm -f "$tmp"' EXIT

# MYSQL_PWD évite d'exposer le mot de passe dans la liste des processus.
MYSQL_PWD="$password" mysqldump --single-transaction --routines --no-tablespaces \
  -h "$host" -P "$port" -u "$user" "$database" | gzip > "$tmp"

# Un dump interrompu ne doit jamais remplacer une sauvegarde valide.
gzip -t "$tmp"
mv "$tmp" "$file"

find "$BACKUP_DIR" -name "${database}_*.sql.gz" -type f -mtime +"$KEEP_DAYS" -delete
echo "Sauvegarde : $file"
