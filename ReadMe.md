# run-service

Node.js module used for running untrusted streaming JavaScript microservice.

see also: `run-remote-service` module

## Features

 - Runs untrusted JavaScript microservices in a single process
 - Services work with any Readable / Writable stream interface
 - Configurable Environments per service
 - Configurable Virtual Machines per service
 - Configurable Timeouts on service execution
 - Catches and traps all possible service error conditions ( through domains and [try-catch](https://github.com/CrabDude/trycatch) module


## Introduction

This module is a minimalist representation of what [hook.io](http://hook.io) uses to execute untrusted source code in our elastic worker pool. You are encouraged to use this module as-is, or modify it to suite your needs.

This project ( and other modules ) are in the process of being pulled out of hook.io's core Hook resource found [here](https://github.com/bigcompany/hook.io/tree/master/lib/resources/hook) and will soon be a dependency in hook.io itself.

If you are interested in contributing please let us know!