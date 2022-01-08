#!/bin/sh

if ! git pull; then
    echo git pull failed. Stopping deployment.
    exit 1
fi;

pm2 restart mapping-api
