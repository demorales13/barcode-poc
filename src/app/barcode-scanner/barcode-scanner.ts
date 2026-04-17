import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    ViewChild,
    computed,
    signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Result } from '@zxing/library';

type ScannerState = 'idle' | 'requesting' | 'scanning' | 'error';

interface ScanResult {
    text: string;
    timestamp: Date;
    format: string;
}

@Component({
    selector: 'app-barcode-scanner',
    imports: [DatePipe],
    templateUrl: './barcode-scanner.html',
    styleUrl: './barcode-scanner.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodeScanner implements OnDestroy {
    @ViewChild('videoElement') private videoRef!: ElementRef<HTMLVideoElement>;

    protected readonly state = signal<ScannerState>('idle');
    protected readonly results = signal<ScanResult[]>([]);
    protected readonly errorMessage = signal<string>('');
    protected readonly lastResult = computed(() => this.results()[0] ?? null);
    protected readonly isScanning = computed(() => this.state() === 'scanning');
    protected readonly hasResults = computed(() => this.results().length > 0);

    private reader = new BrowserMultiFormatReader();
    private controls: IScannerControls | null = null;

    async startScanning(): Promise<void> {
        this.state.set('requesting');
        this.errorMessage.set('');

        try {
            const devices = await BrowserMultiFormatReader.listVideoInputDevices();
            if (devices.length === 0) {
                this.errorMessage.set('No se encontró ninguna cámara en este dispositivo.');
                this.state.set('error');
                return;
            }

            // Prefer the back camera on mobile devices
            const backCamera = devices.find(d =>
                /back|rear|environment/i.test(d.label)
            ) ?? devices[0];

            this.state.set('scanning');

            this.controls = await this.reader.decodeFromVideoDevice(
                backCamera.deviceId,
                this.videoRef.nativeElement,
                (result: Result | undefined, error: unknown) => {
                    if (result) {
                        const newResult: ScanResult = {
                            text: result.getText(),
                            timestamp: new Date(),
                            format: result.getBarcodeFormat().toString(),
                        };
                        this.results.update(prev => {
                            const isDuplicate = prev.length > 0 && prev[0].text === newResult.text;
                            return isDuplicate ? prev : [newResult, ...prev].slice(0, 20);
                        });
                    }
                }
            );
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            if (msg.includes('Permission') || msg.includes('NotAllowed')) {
                this.errorMessage.set('Permiso de cámara denegado. Por favor autoriza el acceso en tu navegador.');
            } else if (msg.includes('NotFound')) {
                this.errorMessage.set('No se encontró ninguna cámara.');
            } else {
                this.errorMessage.set(`No se pudo iniciar la cámara: ${msg}`);
            }
            this.state.set('error');
        }
    }

    stopScanning(): void {
        this.controls?.stop();
        this.controls = null;
        this.state.set('idle');
    }

    clearResults(): void {
        this.results.set([]);
    }

    ngOnDestroy(): void {
        this.stopScanning();
    }
}
