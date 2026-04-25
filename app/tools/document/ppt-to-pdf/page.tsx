'use client';

import { useState, useCallback } from "react";
import { Presentation, Download } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";

// --- Constants & Helpers ---
const EMU_PER_INCH = 914400;
const PX_PER_INCH = 96;
const EMU_PER_PX = EMU_PER_INCH / PX_PER_INCH;
const emuToPx = (emu: number) => emu / EMU_PER_PX;

function getEl(p: Element | Document, tag: string): Element | null {
  return p.getElementsByTagName(tag)[0] || null;
}
function getAllEl(p: Element | Document, tag: string): Element[] {
  return Array.from(p.getElementsByTagName(tag));
}

const FALLBACK_SCHEME: Record<string, string> = {
  dk1: '#000000', dk2: '#44546A', lt1: '#FFFFFF', lt2: '#E7E6E6',
  accent1: '#4472C4', accent2: '#ED7D31', accent3: '#A5A5A5',
  accent4: '#FFC000', accent5: '#5B9BD5', accent6: '#70AD47',
  hlink: '#0563C1', folHlink: '#954F72',
};

async function parseThemeColors(zip: any): Promise<Map<string, string>> {
  const colors = new Map<string, string>();
  try {
    const xml = await zip.file('ppt/theme/theme1.xml')?.async('string');
    if (xml) {
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const scheme = getEl(doc, 'a:clrScheme');
      if (scheme) {
        for (const name of Object.keys(FALLBACK_SCHEME)) {
          const el = getEl(scheme, `a:${name}`);
          if (el) {
            const srgb = getEl(el, 'a:srgbClr');
            const sys = getEl(el, 'a:sysClr');
            if (srgb) colors.set(name, '#' + srgb.getAttribute('val'));
            else if (sys) colors.set(name, '#' + (sys.getAttribute('lastClr') || '000000'));
          }
        }
      }
    }
  } catch (e) { console.warn('Theme parse error:', e); }
  for (const [k, v] of Object.entries(FALLBACK_SCHEME)) {
    if (!colors.has(k)) colors.set(k, v);
  }
  colors.set('tx1', colors.get('dk1')!);
  colors.set('tx2', colors.get('dk2')!);
  colors.set('bg1', colors.get('lt1')!);
  colors.set('bg2', colors.get('lt2')!);
  return colors;
}

function resolveColor(el: Element | null, theme: Map<string, string>): string | null {
  if (!el) return null;
  const srgb = getEl(el, 'a:srgbClr');
  if (srgb) return '#' + srgb.getAttribute('val');
  const sc = getEl(el, 'a:schemeClr');
  if (sc) return theme.get(sc.getAttribute('val') || '') || '#000000';
  return null;
}

function getTransform(shape: Element) {
  const xfrm = getEl(shape, 'a:xfrm');
  if (!xfrm) return null;
  const off = getEl(xfrm, 'a:off');
  const ext = getEl(xfrm, 'a:ext');
  if (!off || !ext) return null;
  return {
    x: emuToPx(parseInt(off.getAttribute('x') || '0')),
    y: emuToPx(parseInt(off.getAttribute('y') || '0')),
    w: emuToPx(parseInt(ext.getAttribute('cx') || '0')),
    h: emuToPx(parseInt(ext.getAttribute('cy') || '0')),
  };
}

async function resolveRels(zip: any, relsPath: string): Promise<Map<string, string>> {
  const rels = new Map<string, string>();
  try {
    const xml = await zip.file(relsPath)?.async('string');
    if (xml) {
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      for (const r of getAllEl(doc, 'Relationship')) {
        rels.set(r.getAttribute('Id')!, r.getAttribute('Target')!);
      }
    }
  } catch (e) { }
  return rels;
}

// Extract background from slide, layout, or master
async function getSlideBackground(
  slideDoc: Document,
  slideRels: Map<string, string>,
  zip: any,
  slidePath: string,
  theme: Map<string, string>
): Promise<{ color?: string, imgData?: string } | null> {
  let bg = getEl(slideDoc, 'p:bg');
  if (!bg) {
    for (const [id, target] of Array.from(slideRels.entries())) {
      if (target.includes('slideLayouts')) {
        const layoutPath = target.startsWith('/') ? target.slice(1) : slidePath.replace(/slides\/slide\d+\.xml$/, '') + target.replace(/^\.\.\//, '');
        try {
          const layoutXml = await zip.file(layoutPath)?.async('string');
          if (layoutXml) {
            const layoutDoc = new DOMParser().parseFromString(layoutXml, 'application/xml');
            bg = getEl(layoutDoc, 'p:bg');
            if (!bg) {
              const layoutRelsPath = layoutPath.replace('slideLayouts/', 'slideLayouts/_rels/') + '.rels';
              const layoutRels = await resolveRels(zip, layoutRelsPath);
              for (const [mId, mTarget] of Array.from(layoutRels.entries())) {
                if (mTarget.includes('slideMasters')) {
                  const masterPath = mTarget.startsWith('/') ? mTarget.slice(1) : layoutPath.replace(/slideLayouts\/slideLayout\d+\.xml$/, '') + mTarget.replace(/^\.\.\//, '');
                  const masterXml = await zip.file(masterPath)?.async('string');
                  if (masterXml) {
                    const masterDoc = new DOMParser().parseFromString(masterXml, 'application/xml');
                    bg = getEl(masterDoc, 'p:bg');
                  }
                }
              }
            }
          }
        } catch (e) { }
      }
    }
  }

  if (bg) {
    const fill = getEl(bg, 'a:solidFill');
    const c = resolveColor(fill, theme);
    if (c) return { color: c };
  }
  return { color: '#ffffff' };
}

async function renderShapes(
  container: HTMLElement,
  parentDoc: Element | Document,
  rels: Map<string, string>,
  zip: any,
  basePath: string,
  theme: Map<string, string>,
  iframeDoc: Document,
  offsetX: number = 0,
  offsetY: number = 0
) {
  // Render normal shapes
  for (const sp of getAllEl(parentDoc, 'p:sp')) {
    if (sp.parentElement?.tagName.endsWith('grpSp')) continue;

    const tf = getTransform(sp);
    if (!tf) continue;

    const div = iframeDoc.createElement('div');
    // Keeping overflow:hidden prevents text from spilling over massively, mimicking PowerPoint's bounding boxes.
    div.style.cssText = `position:absolute;left:${tf.x + offsetX}px;top:${tf.y + offsetY}px;width:${tf.w}px;height:${tf.h}px;overflow:hidden;box-sizing:border-box;`;

    // Fill
    const spPr = getEl(sp, 'p:spPr');
    if (spPr) {
      const c = resolveColor(getEl(spPr, 'a:solidFill'), theme);
      if (c) div.style.backgroundColor = c;
      const ln = getEl(spPr, 'a:ln');
      if (ln) {
        const lc = resolveColor(getEl(ln, 'a:solidFill'), theme);
        if (lc) div.style.border = `${Math.max(1, emuToPx(parseInt(ln.getAttribute('w') || '12700')))}px solid ${lc}`;
      }
      if (getEl(spPr, 'a:prstGeom')?.getAttribute('prst') === 'roundRect') {
        div.style.borderRadius = '8px';
      }
    }

    // Text
    const txBody = getEl(sp, 'p:txBody');
    if (txBody) {
      const bodyPr = getEl(txBody, 'a:bodyPr');
      const anchor = bodyPr?.getAttribute('anchor') || 't';
      div.style.paddingLeft = emuToPx(parseInt(bodyPr?.getAttribute('lIns') || '91440')) + 'px';
      div.style.paddingRight = emuToPx(parseInt(bodyPr?.getAttribute('rIns') || '91440')) + 'px';
      div.style.paddingTop = emuToPx(parseInt(bodyPr?.getAttribute('tIns') || '45720')) + 'px';
      div.style.paddingBottom = emuToPx(parseInt(bodyPr?.getAttribute('bIns') || '45720')) + 'px';

      if (anchor === 'ctr') { div.style.display = 'flex'; div.style.flexDirection = 'column'; div.style.justifyContent = 'center'; }
      else if (anchor === 'b') { div.style.display = 'flex'; div.style.flexDirection = 'column'; div.style.justifyContent = 'flex-end'; }

      const wrap = iframeDoc.createElement('div');
      wrap.style.width = '100%'; // Ensure text wrapper fills the flex container

      for (const p of getAllEl(txBody, 'a:p')) {
        if (p.parentElement !== txBody) continue;

        const pPr = getEl(p, 'a:pPr');
        let lineHeight = '1.2'; // Default fallback

        // Parse specific line spacing
        if (pPr) {
          const lnSpc = getEl(pPr, 'a:lnSpc');
          if (lnSpc) {
            const spcPct = getEl(lnSpc, 'a:spcPct');
            if (spcPct) {
              const val = parseInt(spcPct.getAttribute('val') || '100000');
              lineHeight = (val / 100000).toString();
            }
          }
        }

        const pEl = iframeDoc.createElement('p');
        pEl.style.cssText = `margin:0;padding:0;line-height:${lineHeight};width:100%;`;

        const algn = pPr?.getAttribute('algn');
        if (algn) pEl.style.textAlign = algn === 'ctr' ? 'center' : algn === 'r' ? 'right' : algn === 'just' ? 'justify' : 'left';

        // Bullets
        const buChar = pPr ? getEl(pPr, 'a:buChar') : null;
        if (buChar) {
          const bSpan = iframeDoc.createElement('span');
          bSpan.textContent = (buChar.getAttribute('char') || '•') + ' ';
          pEl.appendChild(bSpan);
        }

        // Space before
        const spcBef = pPr ? getEl(pPr, 'a:spcBef') : null;
        if (spcBef) {
          const pts = getEl(spcBef, 'a:spcPts');
          if (pts) pEl.style.marginTop = `${parseInt(pts.getAttribute('val') || '0') / 100}pt`;
        }

        const defRPr = pPr ? getEl(pPr, 'a:defRPr') : null;
        let hasContent = false;

        // Runs
        for (const r of getAllEl(p, 'a:r')) {
          if (r.parentElement !== p) continue;
          const t = getEl(r, 'a:t');
          if (!t?.textContent) continue;
          hasContent = true;

          const span = iframeDoc.createElement('span');
          span.textContent = t.textContent;
          const rPr = getEl(r, 'a:rPr');
          const sz = rPr?.getAttribute('sz') || defRPr?.getAttribute('sz');
          if (sz) span.style.fontSize = `${parseInt(sz) / 100}pt`;
          if (rPr?.getAttribute('b') === '1') span.style.fontWeight = 'bold';
          if (rPr?.getAttribute('i') === '1') span.style.fontStyle = 'italic';
          if (rPr?.getAttribute('u') === 'sng') span.style.textDecoration = 'underline';

          // EXTRACTION: Text Links
          const hlinkClick = rPr ? getEl(rPr, 'a:hlinkClick') : null;
          if (hlinkClick) {
            const rId = hlinkClick.getAttribute('r:id');
            if (rId && rels.has(rId)) {
              const url = rels.get(rId)!;
              if (url && !url.startsWith('#')) {
                span.setAttribute('data-link', url); // Tag for the PDF step
                span.style.textDecoration = 'underline';
              }
            }
          }

          let colorResolved = false;
          if (rPr) {
            const c = resolveColor(getEl(rPr, 'a:solidFill'), theme);
            if (c) {
              span.style.color = c;
              colorResolved = true;
            }
            const latin = getEl(rPr, 'a:latin');
            const face = latin?.getAttribute('typeface');
            if (face && !face.startsWith('+')) span.style.fontFamily = `"${face}",sans-serif`;
          }
          if (!colorResolved) {
            span.style.color = theme.get('tx1') || '#000000';
          }
          pEl.appendChild(span);
        }

        if (!hasContent) { pEl.innerHTML = '&nbsp;'; pEl.style.fontSize = `${parseInt(defRPr?.getAttribute('sz') || '1200') / 100}pt`; }
        wrap.appendChild(pEl);
      }
      div.appendChild(wrap);
    }
    container.appendChild(div);
  }

  // Render pictures
  for (const pic of getAllEl(parentDoc, 'p:pic')) {
    if (pic.parentElement?.tagName.endsWith('grpSp')) continue;

    const tf = getTransform(pic);
    if (!tf) continue;
    const blip = getEl(pic, 'a:blip');
    const embedId = blip?.getAttribute('r:embed');
    if (!embedId || !rels.has(embedId)) continue;

    const target = rels.get(embedId)!;
    const imgPath = target.startsWith('/')
      ? target.slice(1)
      : basePath.replace(/slides\/slide\d+\.xml$/, '') + target.replace(/^\.\.\//, '');

    // EXTRACTION: Picture Links
    const cNvPr = getEl(pic, 'p:cNvPr');
    const hlinkClick = cNvPr ? getEl(cNvPr, 'a:hlinkClick') : null;
    let linkUrl = '';

    if (hlinkClick) {
      const rId = hlinkClick.getAttribute('r:id');
      if (rId && rels.has(rId)) linkUrl = rels.get(rId)!;
    }

    try {
      const b64 = await zip.file(imgPath)?.async('base64');
      if (b64) {
        const ext = imgPath.split('.').pop()?.toLowerCase() || 'png';
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
        const img = iframeDoc.createElement('img');
        img.src = `data:${mime};base64,${b64}`;
        img.style.cssText = `position:absolute;left:${tf.x + offsetX}px;top:${tf.y + offsetY}px;width:${tf.w}px;height:${tf.h}px;object-fit:fill;`;

        if (linkUrl && !linkUrl.startsWith('#')) {
          img.setAttribute('data-link', linkUrl); // Tag for the PDF step
        }

        container.appendChild(img);
      }
    } catch (e) { console.warn('Image load error:', e); }
  }

  // Render group shapes
  for (const grpSp of getAllEl(parentDoc, 'p:grpSp')) {
    if (grpSp.parentElement?.tagName.endsWith('grpSp') && parentDoc !== grpSp.parentElement) continue;

    const grpPr = getEl(grpSp, 'p:grpSpPr');
    const xfrm = grpPr ? getEl(grpPr, 'a:xfrm') : null;
    if (!xfrm) continue;

    const off = getEl(xfrm, 'a:off');
    const gX = off ? emuToPx(parseInt(off.getAttribute('x') || '0')) : 0;
    const gY = off ? emuToPx(parseInt(off.getAttribute('y') || '0')) : 0;

    await renderShapes(container, grpSp, rels, zip, basePath, theme, iframeDoc, offsetX + gX, offsetY + gY);
  }
}

// --- Build HTML for a single slide inside an iframe (isolated from page CSS) ---
async function buildSlideHTML(
  slideDoc: Document,
  slideRels: Map<string, string>,
  zip: any,
  slidePath: string,
  theme: Map<string, string>,
  wPx: number,
  hPx: number,
): Promise<{ container: HTMLDivElement; iframe: HTMLIFrameElement }> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `position:fixed;left:-99999px;top:0;width:${wPx}px;height:${hPx}px;border:none;visibility:hidden;`;
  document.body.appendChild(iframe);

  await new Promise<void>(resolve => {
    iframe.onload = () => resolve();
    if (iframe.contentDocument?.readyState === 'complete') resolve();
  });

  const iframeDoc = iframe.contentDocument!;
  const container = iframeDoc.createElement('div');
  container.style.cssText = `
    width:${wPx}px;height:${hPx}px;position:relative;
    background:#fff;overflow:hidden;font-family:Calibri,Arial,sans-serif;
    margin:0;padding:0;
  `;
  iframeDoc.body.style.cssText = 'margin:0;padding:0;';
  iframeDoc.body.appendChild(container);

  // Inject fallback fonts and strict text-wrapping rules
  const style = iframeDoc.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,700;1,400&display=swap');
    div, p, span { 
      word-wrap: break-word; 
      white-space: pre-wrap; 
      font-family: 'Calibri', 'Open Sans', sans-serif; 
    }
  `;
  iframeDoc.head.appendChild(style);

  // Apply Background
  const bg = await getSlideBackground(slideDoc, slideRels, zip, slidePath, theme);
  if (bg && bg.color) {
    container.style.backgroundColor = bg.color;
  }

  // Render slide shapes
  await renderShapes(container, slideDoc, slideRels, zip, slidePath, theme, iframeDoc);

  // Wait for images to load
  const images = container.querySelectorAll('img');
  await Promise.all(Array.from(images).map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
  ));

  return { container, iframe };
}

// --- Main conversion ---
async function convertPPTXtoPDF(file: File, onProgress: (p: number) => void): Promise<Blob> {
  const [JSZip, { jsPDF }, html2canvas] = await Promise.all([
    import('jszip').then(m => m.default),
    import('jspdf'),
    import('html2canvas').then(m => m.default),
  ]);

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  onProgress(10);

  const theme = await parseThemeColors(zip);
  const parser = new DOMParser();

  const presStr = await zip.file('ppt/presentation.xml')?.async('string');
  if (!presStr) throw new Error('Invalid PPTX file');
  const presDoc = parser.parseFromString(presStr, 'application/xml');

  const sldSz = getEl(presDoc, 'p:sldSz');
  const slideWPx = emuToPx(parseInt(sldSz?.getAttribute('cx') || '9144000'));
  const slideHPx = emuToPx(parseInt(sldSz?.getAttribute('cy') || '6858000'));
  const slideWIn = parseInt(sldSz?.getAttribute('cx') || '9144000') / EMU_PER_INCH;
  const slideHIn = parseInt(sldSz?.getAttribute('cy') || '6858000') / EMU_PER_INCH;

  const relsStr = await zip.file('ppt/_rels/presentation.xml.rels')?.async('string');
  if (!relsStr) throw new Error('Invalid PPTX file');
  const relsDoc = parser.parseFromString(relsStr, 'application/xml');
  const relMap = new Map<string, string>();
  for (const r of getAllEl(relsDoc, 'Relationship')) relMap.set(r.getAttribute('Id')!, r.getAttribute('Target')!);

  const slideFiles: string[] = [];
  for (const sldId of getAllEl(presDoc, 'p:sldId')) {
    const rId = sldId.getAttribute('r:id');
    if (rId && relMap.has(rId)) {
      const t = relMap.get(rId)!;
      slideFiles.push(t.startsWith('/') ? t.slice(1) : 'ppt/' + t);
    }
  }
  if (!slideFiles.length) throw new Error('No slides found');
  onProgress(15);

  const orientation = slideWIn > slideHIn ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'in', format: [slideWIn, slideHIn] });

  for (let i = 0; i < slideFiles.length; i++) {
    if (i > 0) pdf.addPage([slideWIn, slideHIn], orientation);
    onProgress(15 + (i / slideFiles.length) * 75);

    const slideXml = await zip.file(slideFiles[i])?.async('string');
    if (!slideXml) continue;
    const slideDoc = parser.parseFromString(slideXml, 'application/xml');

    const sRelsPath = slideFiles[i].replace('slides/', 'slides/_rels/') + '.rels';
    const sRels = await resolveRels(zip, sRelsPath);

    const { container, iframe } = await buildSlideHTML(slideDoc, sRels, zip, slideFiles[i], theme, slideWPx, slideHPx);
    try {
      const canvas = await html2canvas(container, {
        width: slideWPx,
        height: slideHPx,
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        foreignObjectRendering: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(imgData, 'JPEG', 0, 0, slideWIn, slideHIn);

      // OVERLAY: Add clickable links natively to the PDF based on the tagged HTML elements
      const scaleX = slideWIn / slideWPx;
      const scaleY = slideHIn / slideHPx;
      const linkElements = container.querySelectorAll('[data-link]');

      linkElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const url = el.getAttribute('data-link');
        if (url) {
          pdf.link(rect.left * scaleX, rect.top * scaleY, rect.width * scaleX, rect.height * scaleY, { url });
        }
      });

    } finally {
      iframe.remove();
    }
  }

  onProgress(95);
  return pdf.output('blob');
}

// --- Page Component ---
export default function PPTToPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setDownloadUrl(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    setDownloadUrl(null);
  }, []);

  const handleConvert = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select a PowerPoint file");
      return;
    }
    setStatus("processing");
    setProgress(0);
    setMessage("Converting to PDF...");

    try {
      const blob = await convertPPTXtoPDF(files[0], setProgress);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setProgress(100);
      setStatus("complete");
      setMessage("Presentation converted to PDF!");
    } catch (err) {
      console.error("Conversion error:", err);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to convert presentation");
    }
  };

  const baseName = files[0]?.name.replace(/\.[^/.]+$/, "") || "presentation";

  return (
    <ToolPage
      title="PowerPoint to PDF"
      description="Convert PowerPoint presentations to PDF format"
      icon={Presentation}
    >
      <div className="space-y-6">
        <FileDropzone
          accept=".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          multiple={false}
          onFilesSelected={handleFilesSelected}
          selectedFiles={files}
          onRemoveFile={handleRemoveFile}
        />

        <div className="rounded-lg bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground">
            Note: This client-side tool attempts to preserve the layout and design of your presentation.
            Complex layouts, grouped shapes, master slides, animations, charts, and SmartArt might not
            be perfectly converted. For exact replication of highly complex documents, desktop software is recommended.
          </p>
        </div>

        {status !== "idle" && (
          <ProgressIndicator progress={progress} status={status} message={message} />
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleConvert}
            disabled={files.length === 0 || status === "processing"}
            className="flex-1"
          >
            {status === "processing" ? "Converting..." : "Convert to PDF"}
          </Button>

          {downloadUrl && (
            <Button asChild variant="secondary">
              <a href={downloadUrl} download={`${baseName}.pdf`}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
          )}
        </div>
      </div>
    </ToolPage>
  );
}