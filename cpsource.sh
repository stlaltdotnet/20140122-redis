#!/bin/sh
echo 'copying ./source ./source2'
rm -rf ./source2
cp -r ./source ./source2
echo 'changing configuration in ./source2'
sed -i -e 's/1980/1981/g' ./source2/httpdconfig.json
sed -i -e 's/altnet0/altnet1/g' ./source2/chatdconfig.json
sed -i -e 's/8090/8091/g' ./source2/chatdconfig.json
sed -i -e 's/8090/8091/g' ./source2/public/loadio.js
