type UploadResult = {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
};

/** POST FormData with real upload % (fetch cannot report xhr.upload progress). */
export function uploadWithProgress(
  url: string,
  form: FormData,
  onProgress: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.responseType = 'text';
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        data = {error: 'Could not read the server response'};
      }
      resolve({ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data});
    };
    xhr.onerror = () => {
      reject(new Error('Upload failed. Check your connection and try again.'));
    };
    xhr.send(form);
  });
}
