#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo: sudo ./install-host.sh" >&2
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl unzip

if ! command -v aws >/dev/null 2>&1; then
  arch="$(dpkg --print-architecture)"
  case "$arch" in
    amd64) aws_arch='x86_64' ;;
    arm64) aws_arch='aarch64' ;;
    *) echo "Unsupported architecture for AWS CLI: $arch" >&2; exit 1 ;;
  esac
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${aws_arch}.zip" -o /tmp/awscliv2.zip
  rm -rf /tmp/aws
  unzip -q /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install --update
  rm -rf /tmp/aws /tmp/awscliv2.zip
fi
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME:-$VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
install -d -m 0750 -o ubuntu -g ubuntu /opt/bukky
usermod -aG docker ubuntu
systemctl enable --now docker

cat >/etc/cron.d/bukky-backup <<'CRON'
17 2 * * * ubuntu cd /opt/bukky && ./backup-postgres.sh >> /var/log/bukky-backup.log 2>&1
CRON
chmod 0644 /etc/cron.d/bukky-backup

echo "Host ready. Reconnect so the ubuntu user receives Docker group membership."
