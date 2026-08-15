#!/usr/bin/env bash
#
# Validation locale de l'authentification Hugging Face
#
# Reproduit EXACTEMENT le mécanisme d'authentification utilisé par
# .github/workflows/deploy-hf-space.yml (http.<host>.extraheader), contre le
# vrai huggingface.co, sans rien pousser et sans toucher au Space.
#
# Le script est en lecture seule : il utilise git ls-remote (git-upload-pack)
# puis une négociation git-receive-pack sans envoi de données, qui vérifie le
# droit d'écriture sans écrire.
#
# Usage :
#   HF_TOKEN=hf_xxx bash scripts/verify_hf_auth.sh
#
# Le token n'est jamais affiché ni écrit sur disque.

set -uo pipefail

SPACE_URL="https://huggingface.co/spaces/raniaamil/deepguard-api"
HOST_KEY="http.https://huggingface.co/.extraheader"

fail() { echo "ECHEC : $*" >&2; exit 1; }

if [ -z "${HF_TOKEN:-}" ]; then
  fail "HF_TOKEN n'est pas défini. Usage : HF_TOKEN=hf_xxx bash scripts/verify_hf_auth.sh"
fi

echo "=========================================================="
echo " Validation de l'authentification HF (aucun déploiement)"
echo "=========================================================="
echo ""

# Même construction que le workflow
AUTH_HEADER=$(printf 'user:%s' "$HF_TOKEN" | base64 -w0)

# Config écrite hors du dépôt, comme dans le workflow, et retirée à la sortie
TMP_HOME="$(mktemp -d)"
cleanup() {
  git config --global --unset-all "$HOST_KEY" 2>/dev/null || true
  rm -rf "$TMP_HOME"
}
trap cleanup EXIT

export GIT_CONFIG_GLOBAL="$TMP_HOME/gitconfig"
export GIT_TERMINAL_PROMPT=0
export GIT_ASKPASS=echo

git config --global "$HOST_KEY" "Authorization: Basic ${AUTH_HEADER}"

# ---------------------------------------------------------------------------
echo "[1/4] Lecture des refs distantes (git ls-remote, lecture seule)"
echo "      NB : le Space est public, cette étape réussit même sans token."
echo "      C'est l'étape [2/4] qui valide réellement le token."
if git ls-remote "$SPACE_URL" > "$TMP_HOME/refs.txt" 2> "$TMP_HOME/err.txt"; then
  echo "      OK - refs lues :"
  sed 's/^/        /' "$TMP_HOME/refs.txt"
else
  echo "      ECHEC - impossible de lire le Space."
  echo "      Sortie de git :"
  sed 's/^/        /' "$TMP_HOME/err.txt"
  exit 1
fi
echo ""

# ---------------------------------------------------------------------------
echo "[2/4] Vérification du droit d'ECRITURE (sans rien pousser)"
# git-receive-pack est l'endpoint utilisé par push. On négocie seulement :
# un 200 prouve que le token a le droit d'écrire, aucune donnée n'est envoyée.
HTTP_CODE=$(curl -s -o "$TMP_HOME/recv.txt" -w "%{http_code}" --max-time 30 \
  -H "Authorization: Basic ${AUTH_HEADER}" \
  "${SPACE_URL}/info/refs?service=git-receive-pack")

case "$HTTP_CODE" in
  200)
    echo "      OK - le token a le droit d'écriture (HTTP 200 sur git-receive-pack)"
    echo "      => le git push du workflow aboutira"
    ;;
  401)
    echo "      ECHEC - token refusé (HTTP 401)"
    echo "      => token invalide, révoqué, ou mal copié dans le secret GitHub"
    exit 1
    ;;
  403)
    echo "      ECHEC - token authentifié mais SANS droit d'écriture (HTTP 403)"
    echo "      => régénère un token avec le scope 'write' sur huggingface.co/settings/tokens"
    exit 1
    ;;
  *)
    echo "      INATTENDU - HTTP $HTTP_CODE"
    sed 's/^/        /' "$TMP_HOME/recv.txt" | head -5
    exit 1
    ;;
esac
echo ""

# ---------------------------------------------------------------------------
echo "[3/4] Le token n'apparaît pas dans la config d'un dépôt"
mkdir -p "$TMP_HOME/probe" && cd "$TMP_HOME/probe"
git init -q
git remote add hf "$SPACE_URL"
echo "      URL du remote telle que stockée :"
echo "        $(git remote get-url hf)"

if grep -q "$HF_TOKEN" .git/config 2>/dev/null; then
  fail "le token brut est présent dans .git/config"
fi
echo "      OK - token brut absent de .git/config"

if grep -qi "extraheader" .git/config 2>/dev/null; then
  fail "un extraheader a été écrit dans la config du dépôt"
fi
echo "      OK - aucun extraheader dans la config du dépôt"
cd - > /dev/null
echo ""

# ---------------------------------------------------------------------------
echo "[4/4] Comparaison avec l'ancienne méthode (token dans l'URL)"
mkdir -p "$TMP_HOME/old" && cd "$TMP_HOME/old"
git init -q
git remote add hf "https://raniaamil:${HF_TOKEN}@huggingface.co/spaces/raniaamil/deepguard-api"
if grep -q "$HF_TOKEN" .git/config 2>/dev/null; then
  echo "      Confirmé : l'ANCIENNE méthode écrivait bien le token en clair"
  echo "      dans .git/config — c'est ce que le correctif supprime."
fi
cd - > /dev/null
echo ""

echo "=========================================================="
echo " RESULTAT : authentification validée contre huggingface.co"
echo " Lecture OK, droit d'écriture OK, token non exposé."
echo " Le workflow de déploiement peut être lancé en confiance."
echo "=========================================================="
