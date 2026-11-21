#!/bin/bash
# ==============================================================================
# HƯỚNG DẪN CÀI ĐẶT NHANH MÔI TRƯỜNG TRÊN VPS UBUNTU 22.04 / 24.04
# ==============================================================================

set -e

echo "=== 1. CẬP NHẬT HỆ THỐNG ==="
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx ufw certbot python3-certbot-nginx

echo "=== 2. CÀI ĐẶT NODE.JS 20 LTS & PM2 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

echo "=== 3. CÀI ĐẶT MONGODB COMMUNITY ==="
sudo apt install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

echo "=== 4. MỞ PORT FIREWALL UFW ==="
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "=== HOÀN TẤT CÀI ĐẶT HẠ TẦNG CƠ BẢN ==="
node -v
npm -v
pm2 -v
sudo systemctl status mongod --no-pager
