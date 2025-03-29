Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/focal64"
  
  config.vm.provider "virtualbox" do |vb|
    vb.memory = "4096"
    vb.cpus = 2
  end

  config.vm.network "private_network", type: "dhcp"

  config.vm.provision "shell", inline: <<-SHELL
    apt-get update
    apt-get install -y nodejs npm docker.io docker-compose
    npm install -g typescript
  SHELL
end
