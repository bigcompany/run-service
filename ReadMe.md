# run-service

Node.js module used for safely running untrusted streaming JavaScript microservices.

see also: `run-remote-service` module

## Introduction

This module is the component which [hook.io](http://hook.io) uses to execute untrusted JavaScript source code in it's elastic worker pool.

You are encouraged to use this module as-is, or modify it to suite your needs. If you are interested in contributing please let us know!

## Features

 - Runs each execution of untrusted JavaScript microservice as new individual process
 - Services work with any Readable / Writable stream interface
 - Ships with `run-service` binary for running services from CLI using STDIN / STDOUT streams
 - Environments per service
 - Virtual Machines per service
 - Configurable Timeouts per service
 - Robust Error Handling


## Caveats

Running untrusted JavaScript code in a safe way is a complex problem. The `run-service` module is only intended to isolate a small part of the entire untrusted source code execution chain.

**If you intend to use this module to run untrusted source code please consider the following.**

### What this module does isolate
 - Service state
 - Service errors
 - Stream / Socket errors
 - Process state ( somewhat, read below)

Multiple service calls to `run-service` in the same process should not be able to affect the state of other services in that process. All errors that can possibily happen during the execution of a service should be trapped and isolated to not affect the current process.

### What this mode does **NOT** isolate
 - Server Memory
 - Server CPU
 - Server file-system
 - Process CPU ( for now )
 - Process Memory ( for now )

`run-service` cannot make any guarantees about the isolation of the server or process itself. All services run in the same process will always be sharing the same process resources (memory and cpu). All services will also have default access to the server's file-system and child processes.

To ensure isolation per process, you will want to spawn a new process per service request. This can be done using the `run-service` binary included in this project.

To ensure isolation of the server file-system, you will want to use the `run-service` binary in a `chroot` jail, or other similiar container solution.

To ensure isolation of the server memory and cpu, you will want to use the `run-service` binary in a virtualized enviroment capable of monitoring and managing resource usage per process.

**Bottom Line**: Do not expect this single module to magically isolate untrusted services. `run-service` is only a small piece of the solution. 

## Reporting Security Issues

If you find a way which `run-service` is not adquately isolating services per process or trapping errors, please file a support issue on Github. You can also privately email [hookmaster@hook.io](hookmaster@hook.io)
