import { Component, signal, computed, afterNextRender, OnDestroy, ElementRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Track {
  title: string;
  videoId: string;
}

const PLAYLIST: Track[] = [
  { title: 'Timeleach', videoId: '-WDRvs-IApc' },
  { title: 'Rhythm of Writhing Constellations', videoId: 'PeLBcmJafCk' },
  { title: 'Lost in the Network', videoId: 'PDB6_Pdol7Q' },
  { title: 'Assert', videoId: 'G4VVV5E5jDM' },
];

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="fixed bottom-4 right-4 z-50">
      @if (expanded()) {
        <div class="bg-surface-2 border border-surface-3 rounded-lg shadow-2xl w-72 overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between px-3 py-2 border-b border-surface-3">
            <span class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Marathon OST</span>
            <button
              class="text-neutral-500 hover:text-neutral-300 cursor-pointer text-sm px-1"
              (click)="expanded.set(false)"
            >&#x2715;</button>
          </div>

          <!-- Track list -->
          <div class="max-h-48 overflow-y-auto">
            @for (track of playlist; track track.videoId; let i = $index) {
              <button
                class="w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2"
                [class.bg-surface-3]="currentIndex() === i"
                [class.text-neutral-200]="currentIndex() === i"
                [class.text-neutral-400]="currentIndex() !== i"
                [class.hover:bg-surface-1]="currentIndex() !== i"
                (click)="playTrack(i)"
              >
                @if (currentIndex() === i && isPlaying()) {
                  <span class="text-green-400 text-xs">&#9654;</span>
                } @else {
                  <span class="text-neutral-600 text-xs">&#9654;</span>
                }
                {{ track.title }}
              </button>
            }
          </div>

          <!-- Custom URL -->
          <div class="px-3 py-2 border-t border-surface-3">
            <div class="flex gap-1">
              <input
                type="text"
                placeholder="YouTube URL or video ID..."
                class="flex-1 px-2 py-1 text-xs bg-surface-3 border border-surface-4 rounded text-neutral-300 placeholder-neutral-600 outline-none focus:border-neutral-400"
                [ngModel]="customUrl()"
                (ngModelChange)="customUrl.set($event)"
                (keydown.enter)="playCustom()"
              />
              <button
                class="px-2 py-1 text-xs bg-surface-3 text-neutral-400 rounded cursor-pointer hover:bg-surface-4 hover:text-neutral-300"
                (click)="playCustom()"
              >&#9654;</button>
            </div>
          </div>

          <!-- Controls -->
          <div class="flex items-center justify-center gap-4 px-3 py-2 border-t border-surface-3">
            <button
              class="text-neutral-400 hover:text-neutral-200 cursor-pointer text-sm"
              (click)="prev()"
            >&#9664;&#9664;</button>
            <button
              class="text-neutral-200 hover:text-white cursor-pointer text-lg"
              (click)="togglePlay()"
            >
              @if (isPlaying()) {
                &#9646;&#9646;
              } @else {
                &#9654;
              }
            </button>
            <button
              class="text-neutral-400 hover:text-neutral-200 cursor-pointer text-sm"
              (click)="next()"
            >&#9654;&#9654;</button>
          </div>

          <!-- Volume -->
          <div class="flex items-center gap-2 px-3 py-2 border-t border-surface-3">
            <span class="text-neutral-500 text-xs">&#128264;</span>
            <input
              type="range"
              min="0"
              max="100"
              [ngModel]="volume()"
              (ngModelChange)="setVolume($event)"
              class="flex-1 h-1 accent-neutral-400 cursor-pointer"
            />
            <span class="text-neutral-500 text-xs w-6 text-right">{{ volume() }}</span>
          </div>

        </div>
      } @else {
        <!-- Collapsed: small music button -->
        <button
          class="w-10 h-10 rounded-full bg-surface-2 border border-surface-3 flex items-center justify-center cursor-pointer hover:bg-surface-3 transition-colors shadow-lg"
          (click)="expanded.set(true)"
        >
          <span class="text-neutral-400 text-sm">&#9835;</span>
        </button>
      }
      <!-- Hidden iframe (always rendered so autoplay works while collapsed) -->
      <div class="h-0 overflow-hidden">
        <div #playerContainer></div>
      </div>
    </div>
  `,
})
export class AudioPlayerComponent implements OnDestroy {
  private playerContainer = viewChild<ElementRef<HTMLDivElement>>('playerContainer');
  private player: any = null;
  private apiReady = false;
  private hasInteracted = false;
  private interactionListener: (() => void) | null = null;

  playlist = [...PLAYLIST];
  expanded = signal(false);
  currentIndex = signal(-1);
  isPlaying = signal(false);
  customUrl = signal('');
  volume = signal(20);

  constructor() {
    // Pull Assert to front, shuffle the rest
    const assertIdx = this.playlist.findIndex(t => t.title === 'Assert');
    if (assertIdx > 0) {
      [this.playlist[0], this.playlist[assertIdx]] = [this.playlist[assertIdx], this.playlist[0]];
    }
    for (let i = this.playlist.length - 1; i > 1; i--) {
      const j = 1 + Math.floor(Math.random() * i);
      [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
    }
    afterNextRender(() => {
      this.loadYouTubeApi();
      this.registerInteractionListener();
    });
  }

  private registerInteractionListener() {
    this.interactionListener = () => {
      if (!this.hasInteracted) {
        this.hasInteracted = true;
        // Start playback on first interaction if not already playing
        if (!this.isPlaying() && this.apiReady) {
          this.playTrack(0);
        }
      }
      document.removeEventListener('click', this.interactionListener!);
      this.interactionListener = null;
    };
    document.addEventListener('click', this.interactionListener);
  }

  private loadYouTubeApi() {
    if ((window as any).YT?.Player) {
      this.apiReady = true;
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    (window as any).onYouTubeIframeAPIReady = () => {
      this.apiReady = true;
      // If user already clicked before API loaded, start now
      if (this.hasInteracted) {
        this.playTrack(0);
      }
    };
  }

  private initPlayer(videoId: string) {
    const container = this.playerContainer()?.nativeElement;
    if (!container || !this.apiReady) return;

    if (this.player) {
      this.player.loadVideoById(videoId);
      return;
    }

    // Create a div for the player
    const div = document.createElement('div');
    container.appendChild(div);

    this.player = new (window as any).YT.Player(div, {
      height: '1',
      width: '1',
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
      },
      events: {
        onReady: (event: any) => {
          event.target.setVolume(this.volume());
          event.target.playVideo();
        },
        onStateChange: (event: any) => {
          // 0 = ended, 1 = playing, 2 = paused
          this.isPlaying.set(event.data === 1);
          if (event.data === 0) {
            this.next();
          }
        },
      },
    });
  }

  playTrack(index: number) {
    this.currentIndex.set(index);
    const track = this.playlist[index];
    if (this.apiReady) {
      this.initPlayer(track.videoId);
    }
  }

  playCustom() {
    const url = this.customUrl().trim();
    if (!url) return;

    let videoId = url;
    // Extract video ID from various YouTube URL formats
    const match = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
    if (match) videoId = match[1];

    // Add to playlist and play
    const newTrack: Track = { title: `Custom: ${videoId.substring(0, 8)}...`, videoId };
    this.playlist = [...this.playlist, newTrack];
    this.customUrl.set('');
    this.playTrack(this.playlist.length - 1);
  }

  togglePlay() {
    if (!this.player) {
      if (this.playlist.length > 0) this.playTrack(0);
      return;
    }
    if (this.isPlaying()) {
      this.player.pauseVideo();
    } else {
      this.player.playVideo();
    }
  }

  prev() {
    const idx = this.currentIndex();
    const newIdx = idx <= 0 ? this.playlist.length - 1 : idx - 1;
    this.playTrack(newIdx);
  }

  next() {
    const idx = this.currentIndex();
    const newIdx = (idx + 1) % this.playlist.length;
    this.playTrack(newIdx);
  }

  setVolume(value: number) {
    this.volume.set(value);
    this.player?.setVolume(value);
  }

  ngOnDestroy() {
    this.player?.destroy();
    if (this.interactionListener) {
      document.removeEventListener('click', this.interactionListener);
    }
  }
}
