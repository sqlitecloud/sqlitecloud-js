#
# upgrade.sh - upload gateway builds to a couple of nodes used for development, restart gateway
#

# upload ./build/ to test nodes
# frankfurt01, frankfurt02, ny01
rsync -avz -e "ssh -i ~/.ssh/id_ed25519" ./build/ sqlitecloud@y8pbz99zp.sqlite.cloud:gateway
rsync -avz -e "ssh -i ~/.ssh/id_ed25519" ./build/ sqlitecloud@oggdnp3zm.sqlite.cloud:gateway

# connect to nodes using ssh key
# ssh -i ~/.ssh/id_ed25519 sqlitecloud@y8pbz99zp.sqlite.cloud
# ssh -i ~/.ssh/id_ed25519 sqlitecloud@og0wjec-m.sqlite.cloud

# restart gateway (locally)
# pkill gateway-linux-x; cd /home/sqlitecloud/gateway; nohup ./gateway-linux-x64.out

# restart gateway (remotely)
ssh -i ~/.ssh/id_ed25519 sqlitecloud@y8pbz99zp.sqlite.cloud 'pkill gateway-linux-x; cd /home/sqlitecloud/gateway; nohup ./gateway-linux-x64.out > /dev/null 2>&1 &'
ssh -i ~/.ssh/id_ed25519 sqlitecloud@oggdnp3zm.sqlite.cloud 'pkill gateway-linux-x; cd /home/sqlitecloud/gateway; nohup ./gateway-linux-x64.out > /dev/null 2>&1 &'