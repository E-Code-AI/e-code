{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.go
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.python311Packages.setuptools
    pkgs.python311Packages.wheel
    pkgs.nodePackages.npm
    pkgs.yarn
    pkgs.postgresql
    pkgs.git
    pkgs.curl
    pkgs.wget
    pkgs.jq
    pkgs.unzip
    pkgs.gcc
    pkgs.gnumake
    pkgs.pkg-config
    pkgs.openssl
    pkgs.zlib
    pkgs.libxcrypt
    pkgs.glibcLocales
    pkgs.google-cloud-sdk
  ];

  env = {
    PYTHON_LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      pkgs.stdenv.cc.cc.lib
      pkgs.zlib
      pkgs.glib
      pkgs.xorg.libX11
    ];
    PYTHONHOME = "${pkgs.python311}";
    PYTHONPATH = "${pkgs.python311}/lib/python3.11/site-packages";
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      pkgs.stdenv.cc.cc.lib
      pkgs.zlib
      pkgs.glib
      pkgs.xorg.libX11
    ];
    GOROOT = "${pkgs.go}/share/go";
    GOPATH = "/home/runner/go";
    PATH = "/home/runner/go/bin:${pkgs.go}/bin:${pkgs.nodejs-20_x}/bin:${pkgs.python311}/bin:/nix/store/*-nodejs-*/bin:/nix/store/*-go-*/bin:/nix/store/*-python3-*/bin:$PATH";
  };
}