
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{m as l}from"./chunk-ERKIQN6P.js";var s=l("language_runtime",["nodejs","python","java","go","ruby","rust","php","c","cpp","csharp","swift","kotlin","dart","typescript","bash","html-css-js","nix","deno","lua","perl","r","haskell","scala","clojure","elixir","julia","ocaml","fortran","zig"]),i={nodejs:{name:"nodejs",displayName:"Node.js",fileExtensions:[".js",".jsx",".json",".ts",".tsx"],defaultFile:"index.js",defaultContent:"console.log('Hello, world!');",runCommand:"node index.js",installCommand:"npm install",packageManager:"npm",packageFile:"package.json",icon:"nodejs",version:"18.x"},python:{name:"python",displayName:"Python",fileExtensions:[".py",".pyw",".pyc",".pyo",".pyd"],defaultFile:"main.py",defaultContent:'print("Hello, world!")',runCommand:"python main.py",installCommand:"pip install -r requirements.txt",packageManager:"pip",packageFile:"requirements.txt",icon:"python",version:"3.11"},java:{name:"java",displayName:"Java",fileExtensions:[".java",".class",".jar"],defaultFile:"Main.java",defaultContent:`public class Main {
  public static void main(String[] args) {
    System.out.println("Hello, world!");
  }
}`,compilerCommand:"javac Main.java",runCommand:"java Main",icon:"java"},go:{name:"go",displayName:"Go",fileExtensions:[".go"],defaultFile:"main.go",defaultContent:`package main

import "fmt"

func main() {
  fmt.Println("Hello, world!")
}`,runCommand:"go run main.go",installCommand:"go mod download",packageManager:"go",packageFile:"go.mod",icon:"go"},ruby:{name:"ruby",displayName:"Ruby",fileExtensions:[".rb",".erb",".gemspec"],defaultFile:"main.rb",defaultContent:'puts "Hello, world!"',runCommand:"ruby main.rb",installCommand:"bundle install",packageManager:"bundler",packageFile:"Gemfile",icon:"ruby"},rust:{name:"rust",displayName:"Rust",fileExtensions:[".rs"],defaultFile:"main.rs",defaultContent:`fn main() {
  println!("Hello, world!");
}`,compilerCommand:"rustc main.rs",runCommand:"./main",installCommand:"cargo build",packageManager:"cargo",packageFile:"Cargo.toml",icon:"rust"},php:{name:"php",displayName:"PHP",fileExtensions:[".php",".phtml",".php7"],defaultFile:"index.php",defaultContent:'<?php echo "Hello, world!"; ?>',runCommand:"php -S 0.0.0.0:8080",installCommand:"composer install",packageManager:"composer",packageFile:"composer.json",icon:"php"},c:{name:"c",displayName:"C",fileExtensions:[".c",".h"],defaultFile:"main.c",defaultContent:`#include <stdio.h>

int main() {
  printf("Hello, world!\\n");
  return 0;
}`,compilerCommand:"gcc main.c -o main",runCommand:"./main",icon:"c"},cpp:{name:"cpp",displayName:"C++",fileExtensions:[".cpp",".cc",".cxx",".hpp",".hh",".hxx"],defaultFile:"main.cpp",defaultContent:`#include <iostream>

int main() {
  std::cout << "Hello, world!" << std::endl;
  return 0;
}`,compilerCommand:"g++ main.cpp -o main",runCommand:"./main",icon:"cpp"},csharp:{name:"csharp",displayName:"C#",fileExtensions:[".cs"],defaultFile:"Program.cs",defaultContent:`using System;

class Program {
  static void Main(string[] args) {
    Console.WriteLine("Hello, world!");
  }
}`,compilerCommand:"dotnet build",runCommand:"dotnet run",installCommand:"dotnet restore",packageManager:"dotnet",packageFile:"*.csproj",icon:"csharp"},swift:{name:"swift",displayName:"Swift",fileExtensions:[".swift"],defaultFile:"main.swift",defaultContent:'print("Hello, world!")',runCommand:"swift main.swift",packageManager:"swift",packageFile:"Package.swift",icon:"swift"},kotlin:{name:"kotlin",displayName:"Kotlin",fileExtensions:[".kt",".kts"],defaultFile:"Main.kt",defaultContent:`fun main() {
  println("Hello, world!")
}`,compilerCommand:"kotlinc Main.kt -include-runtime -d Main.jar",runCommand:"java -jar Main.jar",icon:"kotlin"},dart:{name:"dart",displayName:"Dart",fileExtensions:[".dart"],defaultFile:"main.dart",defaultContent:`void main() {
  print('Hello, world!');
}`,runCommand:"dart main.dart",installCommand:"dart pub get",packageManager:"pub",packageFile:"pubspec.yaml",icon:"dart"},typescript:{name:"typescript",displayName:"TypeScript",fileExtensions:[".ts",".tsx"],defaultFile:"index.ts",defaultContent:"console.log('Hello, world!');",runCommand:"tsx index.ts",installCommand:"npm install",packageManager:"npm",packageFile:"package.json",icon:"typescript",version:"5.0"},bash:{name:"bash",displayName:"Bash",fileExtensions:[".sh",".bash"],defaultFile:"script.sh",defaultContent:'echo "Hello, world!"',runCommand:"bash script.sh",icon:"bash"},"html-css-js":{name:"html-css-js",displayName:"HTML/CSS/JS",fileExtensions:[".html",".htm",".css",".js"],defaultFile:"index.html",defaultContent:`<!DOCTYPE html>
<html>
<head>
  <title>Hello World</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    h1 {
      color: #333;
    }
  </style>
</head>
<body>
  <h1>Hello, world!</h1>
  <script>
    console.log('Hello from JavaScript!');
  </script>
</body>
</html>`,runCommand:"npx serve",installCommand:"npm install serve --no-save",icon:"html"},nix:{name:"nix",displayName:"Nix",fileExtensions:[".nix"],defaultFile:"default.nix",defaultContent:`{ pkgs ? import <nixpkgs> {} }:

pkgs.stdenv.mkDerivation {
  name = "hello-world";
  src = ./.;
  buildPhase = "echo \\"Hello, world!\\" > hello.txt";
  installPhase = "mkdir -p $out && cp hello.txt $out/";
}`,runCommand:"nix-build",icon:"nix"},deno:{name:"deno",displayName:"Deno",fileExtensions:[".ts",".js"],defaultFile:"index.ts",defaultContent:"console.log('Hello, world!');",runCommand:"deno run --allow-net index.ts",icon:"deno"},lua:{name:"lua",displayName:"Lua",fileExtensions:[".lua"],defaultFile:"main.lua",defaultContent:'print("Hello, world!")',runCommand:"lua main.lua",icon:"lua"},perl:{name:"perl",displayName:"Perl",fileExtensions:[".pl",".pm",".cgi"],defaultFile:"main.pl",defaultContent:`#!/usr/bin/perl
use strict;
use warnings;

print "Hello, world!\\n";`,runCommand:"perl main.pl",icon:"perl"},r:{name:"r",displayName:"R",fileExtensions:[".r",".R",".rmd"],defaultFile:"main.R",defaultContent:'print("Hello, world!")',runCommand:"Rscript main.R",icon:"r"},haskell:{name:"haskell",displayName:"Haskell",fileExtensions:[".hs",".lhs"],defaultFile:"Main.hs",defaultContent:`main :: IO ()
main = putStrLn "Hello, world!"`,compilerCommand:"ghc Main.hs -o main",runCommand:"./main",icon:"haskell"},scala:{name:"scala",displayName:"Scala",fileExtensions:[".scala",".sc"],defaultFile:"Main.scala",defaultContent:`object Main extends App {
  println("Hello, world!")
}`,compilerCommand:"scalac Main.scala",runCommand:"scala Main",icon:"scala"},clojure:{name:"clojure",displayName:"Clojure",fileExtensions:[".clj",".cljs",".cljc",".edn"],defaultFile:"main.clj",defaultContent:'(println "Hello, world!")',runCommand:"clojure main.clj",packageManager:"leiningen",packageFile:"project.clj",icon:"clojure"},elixir:{name:"elixir",displayName:"Elixir",fileExtensions:[".ex",".exs"],defaultFile:"main.exs",defaultContent:'IO.puts("Hello, world!")',runCommand:"elixir main.exs",packageManager:"mix",packageFile:"mix.exs",icon:"elixir"},julia:{name:"julia",displayName:"Julia",fileExtensions:[".jl"],defaultFile:"main.jl",defaultContent:'println("Hello, world!")',runCommand:"julia main.jl",packageManager:"Pkg",packageFile:"Project.toml",icon:"julia"},ocaml:{name:"ocaml",displayName:"OCaml",fileExtensions:[".ml",".mli"],defaultFile:"main.ml",defaultContent:'let () = print_endline "Hello, world!"',compilerCommand:"ocamlopt -o main main.ml",runCommand:"./main",packageManager:"opam",icon:"ocaml"},fortran:{name:"fortran",displayName:"Fortran",fileExtensions:[".f",".f90",".f95",".f03"],defaultFile:"main.f90",defaultContent:`program hello
    print *, "Hello, world!"
end program hello`,compilerCommand:"gfortran main.f90 -o main",runCommand:"./main",icon:"fortran"},zig:{name:"zig",displayName:"Zig",fileExtensions:[".zig"],defaultFile:"main.zig",defaultContent:`const std = @import("std");

pub fn main() void {
    std.debug.print("Hello, world!\\n", .{});
}`,runCommand:"zig run main.zig",icon:"zig"}};function m(n){let e=n.substring(n.lastIndexOf("."));for(let[a,t]of Object.entries(i))if(t.fileExtensions.includes(e))return a}function r(n){let e=i[n],a=[{name:e.defaultFile,content:e.defaultContent,isFolder:!1}];return e.packageFile&&(n==="nodejs"||n==="typescript"?a.push({name:"package.json",content:JSON.stringify({name:"my-project",version:"1.0.0",description:"Created with PLOT",main:e.defaultFile,scripts:{start:e.runCommand},dependencies:{},devDependencies:{}},null,2),isFolder:!1}):n==="python"&&a.push({name:"requirements.txt",content:`# Add your dependencies here
`,isFolder:!1})),a}export{s as a,i as b,m as c,r as d};
