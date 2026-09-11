// utils/fileSystem.js

// 唤起选择底片根目录（只需首次或权限失效时点一次）
export async function pickRootFolder() {
  const rootHandle = await window.showDirectoryPicker({ mode: 'read' });
  return rootHandle;
}

/**
 * 后台线程无损等比缩放生成高质量缩略图（长边 500px 足够网格高清展示）
 */
async function generateThumbnail(file, maxDimension = 500) {
  try {
    // 1. 在 Web Worker / 后台线程解码，不阻塞主线程 UI
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    let targetWidth = width;
    let targetHeight = height;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        targetWidth = maxDimension;
        targetHeight = Math.round((height * maxDimension) / width);
      } else {
        targetHeight = maxDimension;
        targetWidth = Math.round((width * maxDimension) / height);
      }
    }

    // 2. 使用 OffscreenCanvas 离屏绘制
    const offscreen = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = offscreen.getContext('2d');
    
    // 启用最高质量的图像平滑算法，消除莫尔纹和颗粒走样
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close(); // 立即释放原图超大解码内存

    // 3. 转成高质量 WebP 或 JPG 缩略图 Blob
    const blob = await offscreen.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    return URL.createObjectURL(blob);
  } catch (e) {
    // 降级兜底
    return URL.createObjectURL(file);
  }
}

export async function loadImagesFromSubfolder(rootHandle, subfolderName) {
  if (!rootHandle || !subfolderName) return [];

  try {
    const dirHandle = await rootHandle.getDirectoryHandle(subfolderName);
    const fileEntries = [];

    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && /\.(jpe?g|png|webp|bmp)$/i.test(entry.name)) {
        fileEntries.push(entry);
      }
    }

    // 按底片序号自然排序（01, 02 ... 36）
    fileEntries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    // 并发生成缩略图（长边 500px），原图链接懒加载
    const imageList = await Promise.all(
      fileEntries.map(async (entry) => {
        const file = await entry.getFile();
        const thumbUrl = await generateThumbnail(file, 500);
        const originalUrl = URL.createObjectURL(file);

        return {
          name: entry.name,
          thumbUrl,     // 仅供列表滚动展示（几十 KB，秒加载）
          originalUrl   // 仅供点击查看原图（几千万像素原图）
        };
      })
    );

    return imageList;
  } catch (err) {
    console.error(`读取文件夹 "${subfolderName}" 失败:`, err);
    return [];
  }
}