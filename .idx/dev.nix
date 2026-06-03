{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_22
  ];
  idx.extensions = [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ];
  idx.previews = {
    previews = {
      web = {
        command = ["sh", "-c", "PORT=$PORT npm run dev"];
        manager = "web";
      };
    };
  };
}
