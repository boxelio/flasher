import {Command, flags} from '@oclif/command'
import { String } from 'lodash'
import { fstat } from 'fs'

class Flash extends Command {
  static description = 'flash an OS image to an SD card'

  static flags = {
    device: flags.string({ char: 'd', description: 'device path to flash to' }),
    help: flags.help({ char: 'h' }),
    hostname: flags.string({ default: 'boxel', description: 'Set the hostname for this image' }),
    'input-file': flags.string({ char: 'i', description: 'source image to customize and flash to SD', required: true }),
    name: flags.string({ char: 'n', description: 'name to print' }),
    'output-file': flags.string({ char: 'o', description: 'cache the customized image to this file' }),
    version: flags.version({ char: 'v' }),
    'wifi-ssid': flags.string({ description: 'set the WiFi SSID for this image' }),
    'wifi-passphrase': flags.string({ description: 'Set the WiFi Passphrase for this image' }),
  }

  static args = [{ name: 'file' }]

  fileExists(filePath:string) {
    const { existsSync } = require('fs');
    return existsSync(filePath);
  }

  async flashImage(filePath:string, devicePath:string) {
    const { spawn } = require('child_process');
    const ProgressBar = require('cli-progress');

    const progressBar = new ProgressBar.SingleBar({
      format: 'Writing Image | {bar} | {percentage}%',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(100, 0, {
      speed: 'N/A'
    });
    
    // const result = execSync(`dd if=${filePath} of=${devicePath} bs=1m`);
    const pv = spawn('pv', ['-n', filePath]);
    const dd = spawn('dd', [`of=${devicePath}`, 'bs=1m'], { stdio: [pv.stdout, 'pipe', 'pipe'] });

    pv.stderr.on('data', (data: string | undefined) => {
      progressBar.update(data);
    });

    dd.stdout.on('data', (data: string | undefined) => {
      this.log(data);
    });
    dd.stderr.on('data', (data: string | undefined) => {
      this.log(`error: ${data}`);
    });
  }

  async run() {
    const {args, flags} = this.parse(Flash)
    const { execSync } = require('child_process');

    const hostname = flags.hostname || 'boxel'
    const inputFile = flags["input-file"];
    const outputFile = flags["output-file"] || `boxel-${new Date().toISOString().slice(0,10)}.img`;

    const deviceName:String = execSync("diskutil list | grep FDisk_partition_scheme | awk 'NF>1{print $NF}'").toString().trim();
    const deviceWriteable = execSync(`diskutil info "${deviceName}" | grep "Read-Only Media" | awk 'NF>1{print \$NF}'`).toString().trim() == 'No';
    const devicePath = `/dev/r${deviceName}`;

    this.log(`Input image from: ${inputFile}`);
    this.log(`Output customized image to: ${outputFile}`);
    this.log(`Flash to device: ${devicePath} (writeable: ${deviceWriteable})`);
    this.log("");

    if (!this.fileExists(inputFile)) {
      this.log(`No such input image "${inputFile}". Exiting...`);
      this.exit(1);
    }

    if (!deviceWriteable) {
      this.log('Device is not writable! Exiting...');
      this.exit(1);
    }

    await this.flashImage(inputFile, devicePath);
  }
}

export = Flash
