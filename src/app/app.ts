import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BarcodeScanner } from './barcode-scanner/barcode-scanner';

@Component({
  selector: 'app-root',
  imports: [BarcodeScanner],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App { }
