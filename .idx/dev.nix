{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_22
    pkgs.nodePackages.typescript-language-server
    pkgs.jdk
  ];
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
