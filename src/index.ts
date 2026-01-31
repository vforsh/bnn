#!/usr/bin/env bun
import { createCli } from "./cli";

const program = createCli();
program.parse(process.argv);
