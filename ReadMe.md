# run-service

Node.js middleware used for running untrusted JavaScript HTTP services.

see also: `run-remote-service` module

## Introduction

This module is a minimalist representation of what [hook.io](http://hook.io) uses to execute untrusted source code in our elastic worker pool. You are encouraged to use this module as-is, or modify it to suite your needs.

This project ( and other modules ) are in the process of being pulled out of hook.io's core Hook resource found [here](https://github.com/bigcompany/hook.io/tree/master/lib/resources/hook) and will soon be a dependency in hook.io itself.

If you are interested in contributing please let us know!