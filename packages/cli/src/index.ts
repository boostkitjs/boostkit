#!/usr/bin/env node
import { program } from 'commander'
import { makeCommand } from './commands/make.js'

program
  .name('artisan')
  .description('⚡ Forge Framework CLI')
  .version('0.0.1')

// Register command groups
makeCommand(program)

// Show help (exit 0) when no command is given
program.action(() => program.help())

program.parse()