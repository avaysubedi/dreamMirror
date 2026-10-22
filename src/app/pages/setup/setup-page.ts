import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AudioAnalyzerService } from '../../core/services/audio-analyzer.service';
import { WORLD_REGISTRY } from '../../visual/worlds/world-registry';

@Component({
  selector: 'app-setup-page',
  templateUrl: './setup-page.html',
  styleUrl: './setup-page.scss',
})
export class SetupPage {
  private readonly router = inject(Router);
  private readonly audio = inject(AudioAnalyzerService);

  readonly worlds = WORLD_REGISTRY;
  readonly world = signal(localStorage.getItem('dm-world') || WORLD_REGISTRY[0]!.id);
  readonly intensity = signal(Number(localStorage.getItem('dm-intensity') || '0.72'));
  readonly quality = signal(localStorage.getItem('dm-quality') || 'balanced');
  readonly transform = signal(localStorage.getItem('dm-transform') || '0');
  readonly audioMode = signal<'demo' | 'mic' | 'file'>('demo');
  readonly audioError = signal('');
  readonly audioFileName = signal('');
  private audioFile: File | null = null;

  selectAudio(event: Event): void {
    this.audioFile = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.audioFileName.set(this.audioFile?.name ?? '');
    this.audioError.set('');
  }

  async launch(): Promise<void> {
    this.audioError.set('');
    try {
      if (this.audioMode() === 'demo') await this.audio.startDemo();
      if (this.audioMode() === 'mic') await this.audio.startMicrophone();
      if (this.audioMode() === 'file') {
        if (!this.audioFile) { this.audioError.set('Choose an audio file to continue.'); return; }
        this.audio.loadFile(this.audioFile);
        await this.audio.audioElement?.play();
      }
    } catch (error) {
      this.audioError.set(error instanceof Error ? error.message : 'Audio could not be started.');
      return;
    }
    localStorage.setItem('dm-world', this.world());
    localStorage.setItem('dm-intensity', String(this.intensity()));
    localStorage.setItem('dm-quality', this.quality());
    localStorage.setItem('dm-transform', this.transform());
    void this.router.navigateByUrl('/display');
  }
}
