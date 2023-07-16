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

tag=$(npm version $version)
git commit -a -m "version $tag release"
git push origin && git push origin $tag