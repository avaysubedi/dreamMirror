/**
 * Future feature contracts. Interfaces only — not implemented in MVP.
 */

export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceTrackingResult {
  detected: boolean;
  landmarks: FaceLandmark[];
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface FaceTrackingService {
  start(video: HTMLVideoElement): Promise<void>;
  stop(): void;
  latest(): FaceTrackingResult | null;
}

export type EmotionLabel = 'joy' | 'calm' | 'awe' | 'intensity' | 'unknown';

export interface EmotionDetectionService {
  classify(frame: ImageBitmap | HTMLVideoElement): Promise<EmotionLabel>;
}

export interface CrowdDetectionService {
  estimateCount(frame: HTMLVideoElement): Promise<number>;
}

export interface PoseJoint {
  name: string;
  x: number;
  y: number;
  confidence: number;
}

export interface PoseDetectionService {
  estimate(video: HTMLVideoElement): Promise<PoseJoint[]>;
}

export interface AiGeneratedWorldRequest {
  mood: string;
  energy: number;
  seed: number;
}

export interface AiGeneratedWorldsService {
  propose(request: AiGeneratedWorldRequest): Promise<{ worldId: string }>;
}

export interface AiDirectorDecision {
  nextWorldId: string;
  intensity: number;
  reason: string;
}

export interface AiDirectorService {
  decide(energy: number, emotion: EmotionLabel): Promise<AiDirectorDecision>;
}

export type GestureName = 'raise-hands' | 'point' | 'open-arms' | 'still';

export interface GestureControlsService {
  detect(pose: PoseJoint[]): GestureName;
}

export interface MultiCameraSlot {
  id: string;
  label: string;
  stream: MediaStream;
}

export interface MultiCameraModeService {
  slots(): MultiCameraSlot[];
  activate(id: string): void;
}

export interface DjControllerEvent {
  control: string;
  value: number;
}

export interface DjControllerIntegrationService {
  connect(): Promise<void>;
  disconnect(): void;
  onEvent(handler: (event: DjControllerEvent) => void): void;
}
