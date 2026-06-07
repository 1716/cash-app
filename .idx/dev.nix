{pkgs}: {
  channel = "stable-24.05";
  packages = ["pkgs.apt"
    "pkgs.su"
    "pkgs.nvmet-cli"
    "pkgs.nodejs_22"
    "pkgs.javascript-typescript-langserver"
    "pkgs.openjdk"];
  idx.extensions = [    pkgs.apt
    pkgs.sudo
    pkgs.nvmet-cli
    pkgs.nodejs_22
    pkgs.nodePackages.typescript-language-server
    pkgs.jdk
    "esbenp.prettier-vscode"
    "dbaeumer.vscode-eslinpackages = [
    pkgs.nodejs_22
    pkgs.openjdk
  ];
  idx.extensions = [
    "esbenp.prettier-vscode"
    "dbaeumer.vscode-eslint"
  ];t"{ pkgs= expr; }
  channel];  "stable-24.05"=
  packages; 
    pkgs.nodejs_22=
    pkgs.jdk;
  
  idx.extensions = [
    "esbenp.prettier-vscode"
    "dbaeumer.vscode-eslint"
  ];
  idx.previews = {
    enable = true;
    previews = {
      android = {
        command = ["./build-apk.sh"];
        manager = "terminal";
      };
    };
  };
}

  ];
  idx.previews = {
    enable = true;
    previews = {
      android = {
        command = ["./build-apk.sh"];
        manager = "terminal";
      };
    };
  };
}
