export interface AudioFrame {
  volume: number;
  rms: number;
  bass: number;
  mid: number;
  treble: number;
  beat: number;
  energy: number;
  drop: number;
}

export function createAudioFrame(): AudioFrame {
  return {
    volume: 0,
    rms: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    beat: 0,
    energy: 0,
    drop: 0,
  };
}
