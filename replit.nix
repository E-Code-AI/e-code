# Nix environment for Replit. Pins Node.js 20 and git.
{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.git
  ];
}