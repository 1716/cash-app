{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_22
    pkgs.nodePackages.typescript-language-server
    pkgs.jdk
    pkgs.nodePackages.tailwindcss-language-server
    pkgs.npm
    pkgs.yarn
  ];
  idx.extensions = [
    "esbenp.prettier-vscode"
    "dbaeumer.vscode-eslint"
    "bradlc.vscode-tailwindcss"
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
