#!/bin/sh
#
# This script copies the ./source directory to ./source2,
# and updates the configuration of ./source2 so that two
# instances of the application can be run at the same time.
#
echo 'copying ./source ./source2'
rm -rf ./source2
cp -r ./source ./source2
echo 'changing configuration in ./source2'
sed -i -e 's/1980/1981/g' ./source2/httpdconfig.json
sed -i -e 's/altnet0/altnet1/g' ./source2/chatdconfig.json
sed -i -e 's/8090/8091/g' ./source2/chatdconfig.json
sed -i -e 's/8090/8091/g' ./source2/public/loadio.js
