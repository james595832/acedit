'use client';

import {useEffect, useRef, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {StatusDot} from '@astryxdesign/core/StatusDot';

const MAX_SECONDS = 120;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: {error: string}) => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: {transcript: string};
  }>;
};

type VoiceRecorderProps = {
  sessionId: string;
  questionId: string;
  onComplete: (payload: {
    answerId: string;
    transcription: string;
    source: string;
  }) => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function VoiceRecorder({
  sessionId,
  questionId,
  onComplete,
}: VoiceRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finalTranscriptRef = useRef('');
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [level, setLevel] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognition()));
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) {
          void stopRecording();
          return MAX_SECONDS;
        }
        return s + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  function stopMeter() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setLevel(0);
  }

  function startMeter(stream: MediaStream) {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      const current = analyserRef.current;
      if (!current) return;
      current.getByteFrequencyData(data);
      const avg = data.reduce((sum, n) => sum + n, 0) / data.length;
      setLevel(Math.min(100, Math.round((avg / 80) * 100)));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

  async function startRecording() {
    setError(null);
    setLiveTranscript('');
    finalTranscriptRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      startMeter(stream);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : undefined;
      const recorder = mimeType
        ? new MediaRecorder(stream, {mimeType})
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        stopMeter();
        void uploadRecording();
      };
      mediaRecorderRef.current = recorder;
      // Timeslice keeps chunks flowing; some browsers buffer until stop otherwise.
      recorder.start(1000);

      const SpeechRecognitionCtor = getSpeechRecognition();
      if (SpeechRecognitionCtor) {
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event) => {
          let interim = '';
          let finalChunk = '';
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const piece = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalChunk += `${piece} `;
            else interim += piece;
          }
          if (finalChunk) {
            finalTranscriptRef.current =
              `${finalTranscriptRef.current} ${finalChunk}`.trim();
          }
          setLiveTranscript(
            `${finalTranscriptRef.current} ${interim}`.trim(),
          );
        };
        recognition.onerror = (event) => {
          if (event.error !== 'aborted' && event.error !== 'no-speech') {
            setError(`Speech recognition: ${event.error}`);
          }
        };
        recognitionRef.current = recognition;
        recognition.start();
      }

      setSeconds(0);
      setIsRecording(true);
    } catch {
      stopMeter();
      setError('Microphone permission is required to record an answer.');
    }
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    setIsRecording(false);
  }

  async function uploadRecording() {
    setIsUploading(true);
    try {
      const blob = new Blob(chunksRef.current, {type: 'audio/webm'});
      const form = new FormData();
      form.append('audio', blob, 'answer.webm');
      form.append('question_id', questionId);
      form.append('session_id', sessionId);
      form.append('transcription', finalTranscriptRef.current.trim());

      const res = await fetch('/api/interview/answer-record', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Upload failed');
      }

      onComplete({
        answerId: data.answer_id,
        transcription: data.transcription,
        source: data.source ?? 'browser',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save recording');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <VStack gap={4}>
      {error ? (
        <Banner status="error" title="Recording error" description={error} />
      ) : null}

      {!speechSupported ? (
        <Banner
          status="warning"
          title="Live listening limited"
          description="This browser has no Speech Recognition API. Use Chrome or Edge so your words are transcribed while you speak."
        />
      ) : null}

      <section
        className={`aced-record${isRecording ? ' aced-record--live' : ''}`}
        aria-label="Answer recording"
      >
        <div className="aced-record__status">
          {isRecording ? (
            <>
              <StatusDot
                variant="error"
                label="Recording in progress"
                isPulsing
              />
              <Text type="label">Recording</Text>
              <time className="aced-record__clock" dateTime={`PT${seconds}S`}>
                {formatClock(seconds)}
              </time>
            </>
          ) : (
            <>
              <StatusDot variant="neutral" label="Ready to record" />
              <Text type="label" color="secondary">
                Ready · up to {formatClock(MAX_SECONDS)}
              </Text>
            </>
          )}
        </div>

        <Text type="supporting" color="secondary" as="p">
          {isRecording
            ? 'Keep talking. When you stop, we save your words and score that transcript against this question’s rubric.'
            : 'Your browser mic listens live (Chrome/Edge work best). We grade the transcript — not the audio file itself.'}
        </Text>

        {isRecording ? (
          <VStack gap={2}>
            <ProgressBar
              label="Time remaining"
              value={seconds}
              max={MAX_SECONDS}
              hasValueLabel
              formatValueLabel={(value, max) =>
                `${formatClock(value)} / ${formatClock(max)}`
              }
              variant={seconds > MAX_SECONDS * 0.85 ? 'warning' : 'accent'}
            />
            <ProgressBar
              label="Microphone level"
              value={level}
              max={100}
              hasValueLabel
              formatValueLabel={value =>
                value < 8 ? 'Quiet. Speak up!' : `${value}% input`
              }
              variant={level < 8 ? 'warning' : 'success'}
            />
          </VStack>
        ) : null}

        {isRecording || liveTranscript ? (
          <div className="aced-record__transcript">
            <Text type="label" color="secondary">
              Live transcript
            </Text>
            <Text as="p">{liveTranscript || 'Waiting for speech…'}</Text>
          </div>
        ) : null}

        <HStack gap={2}>
          {!isRecording ? (
            <Button
              label="Record your answer"
              variant="primary"
              isDisabled={isUploading}
              clickAction={startRecording}
            />
          ) : (
            <Button
              label="Stop your answer"
              variant="destructive"
              clickAction={async () => stopRecording()}
            />
          )}
          {isUploading ? (
            <Text type="label" color="secondary">
              Saving answer…
            </Text>
          ) : null}
        </HStack>
      </section>
    </VStack>
  );
}
