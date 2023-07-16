#!/usr/bin/env bash
while getopts u:a:f: flag
do
    case "${flag}" in
        f) dir=${OPTARG};;
    esac
done

arg=$1
version=($(echo ${arg:=patch}))
cwd=($(pwd))
current_dir="${cwd}/projects/ngx-azl-cache"

echo $current_dir
cd "$current_dir"
tag=$(npm version $version)
git commit -a -m "version $tag release"
