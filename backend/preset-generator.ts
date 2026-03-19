import fs from 'fs';
import path from 'path';
import { getConfigFile } from './config-api.js';

function getTitleId(xml: string, title: string) {
    const regex = new RegExp(`<Input[^>]*?Title="${title}"[^>]*?>`);
    const inputMatch = xml.match(regex);
    if (!inputMatch) return null;

    const keyMatch = inputMatch[0].match(/Key="([^"]+)"/);
    return keyMatch ? keyMatch[1] : null;
}

function getFullXML(xml: string, inputs: string[]) {
    const matches = xml.match(/<State/g);
    const cnt = matches?.length ?? 0;

    if (cnt === 0) throw new Error('Error parsing the base file, <State /> tag not found.');
    else if (cnt > 1)
        throw new Error('Error parsing the base file, multiple <State /> tags found.');

    return xml.replace(/(\s*)<State/, `$1${inputs.join('\r\n')}\r\n$1<State`);
}

export function createPresetFile(folderPath: string, baseFilePath: string) {
    const baseXML = fs.readFileSync(baseFilePath, 'utf-8');

    const micId = getTitleId(baseXML, 'Mic');
    const camId = getTitleId(baseXML, 'Cam');

    const fileMap = getFolderFiles(folderPath);

    const inputsXML: string[] = [];
    const otherInputsXML: string[] = [];
    const helperInputsXML: string[] = [];

    const otherFiles = fileMap.get(-1) ?? [];
    otherFiles.forEach((f) => otherInputsXML.push(getFileXML(f)));
    fileMap.delete(-1);

    const config = getConfigFile(folderPath);
    const sortedKeys = Array.from(fileMap.keys()).sort();
    for (const key of sortedKeys) {
        const files = fileMap.get(key)!;
        const options = config.get(key) ?? [];
        const layers: string[] = [];
        if (micId && options.includes('mic')) layers.push(micId);

        console.assert(files.length > 0);
        if (files.length === 1) {
            inputsXML.push(getFileXML(files[0], layers, config.get(key)));
            continue;
        }
        const audios = files.filter((f) => f.type === FILE_TYPES.AUDIO);
        const videos = files.filter((f) => f.type === FILE_TYPES.VIDEO);
        const images = files.filter((f) => f.type === FILE_TYPES.IMAGE);
        const slideshows = files.filter((f) => f.type === FILE_TYPES.FOLDER);

        // Ignore any strange cases
        if (audios.length + videos.length > 1 || images.length + slideshows.length > 1) {
            files.forEach((f) => inputsXML.push(getFileXML(f, layers, options)));
        }

        if (audios.length > 0 || videos.length > 0) {
            const base = audios[0] ?? videos[0];
            const top = images[0] ?? slideshows[0];
            if (top) {
                layers.push(top.id);
                helperInputsXML.push(getFileXML(top, [], [...options, 'collapsed']));
            }
            inputsXML.push(getFileXML(base, layers, options));
        } else if (images.length > 0 && options.includes('cam') && camId) {
            layers.push(images[0].id);
            getVirtualInput({ id: camId, newId: crypto.randomUUID() }, layers);
        } else {
            files.forEach((f) => inputsXML.push(getFileXML(f, layers, options)));
        }
    }

    const folderName = path.basename(folderPath);
    const parentName = path.basename(path.dirname(folderPath));

    const outputName = `${parentName} ${folderName}.vmix`;
    const outputPath = path.join(folderPath, outputName);

    // Save file
    const newXML = getFullXML(baseXML, [...inputsXML, ...otherInputsXML, ...helperInputsXML]);
    fs.writeFileSync(outputPath, newXML, 'utf-8');

    return outputPath;
}

// ===== File Scan =====

const FILE_TYPES = { IMAGE: 'Image', VIDEO: 'Video', AUDIO: 'AudioFile', FOLDER: 'Photos' };

function getLeadingNumber(text: string) {
    const match = text.match(/^\s*(\d+)/);
    return match ? Number(match[1]) : -1;
}

function getFileType(filePath: string) {
    const IMAGE_EXT = ['.jpg', '.png', '.jpeg'];
    const VIDEO_EXT = ['.mp4', '.mov', '.m4a'];
    const AUDIO_EXT = ['.mp3', '.wav'];

    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) return FILE_TYPES.FOLDER;
    const ext = path.extname(filePath).toLowerCase();

    if (IMAGE_EXT.includes(ext)) return FILE_TYPES.IMAGE;
    if (VIDEO_EXT.includes(ext)) return FILE_TYPES.VIDEO;
    if (AUDIO_EXT.includes(ext)) return FILE_TYPES.AUDIO;

    return null;
}

function getFolderFiles(folderPath: string) {
    let fileNames = fs.readdirSync(folderPath, 'utf8');

    fileNames.sort((a, b) => {
        const numA = getLeadingNumber(a);
        const numB = getLeadingNumber(b);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
    });

    const fileMap = new Map<number, { path: string; type: string; id: string }[]>();
    for (const name of fileNames) {
        const number = getLeadingNumber(name);
        const fullPath = path.join(folderPath, name);
        const type = getFileType(fullPath);

        if (!type) continue;

        if (!fileMap.get(number)) fileMap.set(number, []);
        fileMap.get(number)?.push({ path: fullPath, type: type, id: crypto.randomUUID() });
    }

    return fileMap;
}

// ===== XML Inputs =====

function getAudioOptions(options: string[]) {
    const token = options.find((opt) => opt.endsWith('%')) ?? '100%';
    let volume = parseInt(token.replace('%', ''));
    volume = isNaN(volume) ? 100 : volume;
    const fraq = (volume / 100).toFixed(2);
    return {
        volume: volume > 100 ? '1' : fraq,
        gain: volume > 100 ? fraq : '1',
    };
}

function getFileXML(
    file: { path: string; type: string; id: string },
    layers: string[] = [],
    options: string[] = [],
) {
    if (file.type === FILE_TYPES.IMAGE) {
        return getImageXML(file, layers, options);
    } else if (file.type === FILE_TYPES.VIDEO) {
        return getVideoXML(file, layers, options);
    } else if (file.type === FILE_TYPES.AUDIO) {
        return getAudioXML(file, layers, options);
    } else if (file.type === FILE_TYPES.FOLDER) {
        return getPhotosXML(file, layers, options);
    }

    return '';
}

function getImageXML(
    file: { path: string; id: string },
    layers: string[] = [],
    options: string[] = [],
) {
    const layersText = layers.map((layer, i) => `Overlay${i}="${layer}"`).join('');
    const collapsed = options.includes('collapsed') ? 'True' : 'False';

    return `<Input Type="1" Position="0" RangeStart="0" RangeStop="0" State="1" OriginalTitle="${path.basename(file.path)}"
      ShortcutMappings="" Key="${file.id}" Loop="False" VolumeF="1" Muted="True"
      BalanceF="0" AspectRatio="100" Category="0" MouseClickAction="0" GOClickAction="20" Collapsed="${collapsed}"
      Solo="False" BusMVolumeF="1" HeadphonesVolumeF="1" BusAVolumeF="1" BusBVolumeF="1" BusCVolumeF="1"
      BusDVolumeF="1" BusEVolumeF="1" BusFVolumeF="1" BusGVolumeF="1" BusMaster="True" FrameDelay="0"
      TallyNumber="0" AutoAudioMixing="True" AutoPause="True" AutoRestart="False" AutoPlay="True" Mirror="False"
      SelectedIndex="0" Rate="1" FlattenLayers="False" ${layersText} VideoShader_ClippingX1="0"
      VideoShader_ClippingX2="1" VideoShader_ClippingY1="0" VideoShader_ClippingY2="1">${file.path}</Input>`;
}

function getVideoXML(
    file: { path: string; id: string },
    layers: string[] = [],
    options: string[] = [],
) {
    const layersText = layers.map((layer, i) => `Overlay${i}="${layer}"`).join('');
    const { volume, gain } = getAudioOptions(options);
    const loop = options.includes('loop') ? 'True' : 'False';

    return `<Input Type="0" Position="0" RangeStart="0" RangeStop="0" State="1" OriginalTitle="${path.basename(file.path)}"
        ShortcutMappings="" Key="${file.id}" Loop="${loop}" VolumeF="${volume}" Muted="True" BalanceF="0" AspectRatio="100" Category="0"
        MouseClickAction="0" GOClickAction="20" Collapsed="False" SoloPFLMode="False" MetersPF="False" Solo="False" BusMVolumeF="1"
        HeadphonesVolumeF="1" BusAVolumeF="1" BusBVolumeF="1" BusCVolumeF="1" BusDVolumeF="1" BusEVolumeF="1" BusFVolumeF="1" BusGVolumeF="1"
        MixerCollapsed="False" MixerVisible="True" AudioBusExtended="False" AudioDelay="0" AudioChannel="0" AudioGain="${gain}" AudioPad="False"
        AudioCompressorEnabled="False" AudioCompressorRatio="1" AudioCompressorThreshold="0.1258925" AudioNoiseGateEnabled="False"
        AudioNoiseGateThreshold="0" AudioEQEnabled="False" AudioEQGainDB0="0" AudioEQGainDB1="0" AudioEQGainDB2="0" AudioEQGainDB3="0"
        AudioEQGainDB4="0" AudioEQGainDB5="0" AudioEQGainDB6="0" AudioEQGainDB7="0" AudioEQGainDB8="0" AudioEQGainDB9="0" AudioAGCEnabled="False"
        AudioRackXML="&lt;plugins /&gt;" BusMaster="True" BusA="True" FrameDelay="0" TallyCOMPort="None" TallyNumber="0" AutoAudioMixing="True"
        AutoPause="True" AutoRestart="True" AutoPlay="True" Mirror="False" SelectedIndex="0" Rate="1" FlattenLayers="False" ${layersText} XML=""
        ShaderSource="00000000-0000-0000-0000-000000000000" PTZProvider="" PTZConnection="" PTZAutoConnect="False" PTZDefaultPanTiltSpeed="0.5"
        PTZDefaultZoomSpeed="0.5" PTZDefaultPositionSpeed="1" PTZDefaultFocusSpeed="0.5" PTZDefaultFocusEnabled="False" PTZDefaultTallyEnabled="False"
        PTZAlwaysShowThumbnail="False" VideoInterlaced="False" VideoShader_ColorCorrectionSourceEnabled="0" VideoShader_White="1" VideoShader_Black="0"
        VideoShader_Red="0" VideoShader_Green="0" VideoShader_Blue="0" VideoShader_Alpha="1" VideoShader_Saturation="1" VideoShader_CCLiftR="0"
        VideoShader_CCLiftG="0" VideoShader_CCLiftB="0" VideoShader_CCGammaR="1" VideoShader_CCGammaG="1" VideoShader_CCGammaB="1" VideoShader_CCGainR="1"
        VideoShader_CCGainG="1" VideoShader_CCGainB="1" VideoShader_Saturation2="0" VideoShader_Hue="0" VideoShader_Rec601Fix="False" VideoShader_ColorKey="0"
        VideoShader_Deinterlace="False" VideoShader_Sharpen="False" VideoShader_ToleranceRed="0" VideoShader_ToleranceGreen="0" VideoShader_ToleranceBlue="0"
        VideoShader_ToleranceGreenGap="0" VideoShader_GreenFilter="False" VideoShader_GreenFilterTransparencyThreshold="1" VideoShader_LumaKeyThreshold="0"
        VideoShader_AntiAliasing="False" VideoShader_AntiAliasingFilter="0" VideoShader_ClippingX1="0" VideoShader_ClippingX2="1" VideoShader_ClippingY1="0"
        VideoShader_ClippingY2="1" VideoShader_PremultipliedAlpha="False">${file.path}</Input>`;
}

function getAudioXML(
    file: { path: string; id: string },
    layers: string[] = [],
    options: string[] = [],
) {
    const layersText = layers.map((layer, i) => `Overlay${i}="${layer}"`).join('');
    const { volume, gain } = getAudioOptions(options);
    const loop = options.includes('loop') ? 'True' : 'False';

    return `<Input Type="0" Position="0" RangeStart="0" RangeStop="0" State="1" OriginalTitle="${path.basename(file.path)}"
        ShortcutMappings="" Key="${file.id}" Loop="${loop}" VolumeF="${volume}" Muted="True" BalanceF="0" AspectRatio="100"
        Category="0" MouseClickAction="0" GOClickAction="20" Collapsed="False" SoloPFLMode="False" MetersPF="False" Solo="False"
        BusMVolumeF="1" HeadphonesVolumeF="1" BusAVolumeF="1" BusBVolumeF="1" BusCVolumeF="1" BusDVolumeF="1" BusEVolumeF="1"
        BusFVolumeF="1" BusGVolumeF="1" MixerCollapsed="False" MixerVisible="True" AudioBusExtended="False" AudioDelay="0"
        AudioChannel="0" AudioGain="${gain}" AudioPad="False" AudioCompressorEnabled="False" AudioCompressorRatio="1"
        AudioCompressorThreshold="0.1258925" AudioNoiseGateEnabled="False" AudioNoiseGateThreshold="0" AudioEQEnabled="False"
        AudioEQGainDB0="0" AudioEQGainDB1="0" AudioEQGainDB2="0" AudioEQGainDB3="0" AudioEQGainDB4="0" AudioEQGainDB5="0"
        AudioEQGainDB6="0" AudioEQGainDB7="0" AudioEQGainDB8="0" AudioEQGainDB9="0" AudioAGCEnabled="False" AudioRackXML="&lt;plugins /&gt;"
        BusMaster="True" BusA="True" FrameDelay="0" TallyCOMPort="None" TallyNumber="0" AutoAudioMixing="True" AutoPause="False"
        AutoRestart="False" AutoPlay="True" Mirror="False" SelectedIndex="0" Rate="1" FlattenLayers="False" ${layersText}
        XML="" ShaderSource="00000000-0000-0000-0000-000000000000" PTZProvider="" PTZConnection="" PTZAutoConnect="False"
        PTZDefaultPanTiltSpeed="0.5" PTZDefaultZoomSpeed="0.5" PTZDefaultPositionSpeed="1" PTZDefaultFocusSpeed="0.5"
        PTZDefaultFocusEnabled="False" PTZDefaultTallyEnabled="False" PTZAlwaysShowThumbnail="False" VideoInterlaced="False"
        VideoShader_ColorCorrectionSourceEnabled="0" VideoShader_White="1" VideoShader_Black="0" VideoShader_Red="0" VideoShader_Green="0"
        VideoShader_Blue="0" VideoShader_Alpha="1" VideoShader_Saturation="1" VideoShader_CCLiftR="0" VideoShader_CCLiftG="0"
        VideoShader_CCLiftB="0" VideoShader_CCGammaR="1" VideoShader_CCGammaG="1" VideoShader_CCGammaB="1" VideoShader_CCGainR="1"
        VideoShader_CCGainG="1" VideoShader_CCGainB="1" VideoShader_Saturation2="0" VideoShader_Hue="0" VideoShader_Rec601Fix="False"
        VideoShader_ColorKey="0" VideoShader_Deinterlace="False" VideoShader_Sharpen="False" VideoShader_ToleranceRed="0"
        VideoShader_ToleranceGreen="0" VideoShader_ToleranceBlue="0" VideoShader_ToleranceGreenGap="0" VideoShader_GreenFilter="False"
        VideoShader_GreenFilterTransparencyThreshold="1" VideoShader_LumaKeyThreshold="0" VideoShader_AntiAliasing="False"
        VideoShader_AntiAliasingFilter="0" VideoShader_ClippingX1="0" VideoShader_ClippingX2="1" VideoShader_ClippingY1="0"
        VideoShader_ClippingY2="1" VideoShader_PremultipliedAlpha="False">${file.path}</Input>`;
}

function getPhotosXML(
    file: { path: string; id: string },
    layers: string[] = [],
    options: string[] = [],
) {
    const layersText = layers.map((layer, i) => `Overlay${i}="${layer}"`).join('');
    const slideshowTime = options.find((opt) => opt.endsWith('s')) ?? '10s';
    const time = parseInt(slideshowTime) ?? 10;

    return `<Input Type="2" Position="0" RangeStart="0" RangeStop="0" State="1" OriginalTitle="${path.basename(file.path)}"
        ShortcutMappings="" Key="${file.id}" Loop="True" VolumeF="1" Muted="True" BalanceF="0" AspectRatio="100" Category="0"
        MouseClickAction="0" GOClickAction="20" Collapsed="True" Solo="False" BusMVolumeF="1" HeadphonesVolumeF="1" BusAVolumeF="1"
        BusBVolumeF="1" BusCVolumeF="1" BusDVolumeF="1" BusEVolumeF="1" BusFVolumeF="1" BusGVolumeF="1" BusMaster="True" FrameDelay="0"
        TallyCOMPort="None" TallyNumber="0" AutoAudioMixing="True" AutoPause="True" AutoRestart="True" AutoPlay="False" Mirror="False"
        SelectedIndex="1" Rate="1" FlattenLayers="False" ${layersText} XML="&lt;indexMappings /&gt;" ShaderSource="00000000-0000-0000-0000-000000000000"
        PTZProvider="" PTZConnection="" PTZAutoConnect="False" PTZDefaultPanTiltSpeed="0.5" PTZDefaultZoomSpeed="0.5" PTZDefaultPositionSpeed="1"
        PTZDefaultFocusSpeed="0.5" PTZDefaultFocusEnabled="False" PTZDefaultTallyEnabled="False" PTZAlwaysShowThumbnail="False"
        PictureTransition="${String(time)}" PictureDuration="500" PictureEffect="0" PictureBlackBorders="True" VideoShader_ColorCorrectionSourceEnabled="0"
        VideoShader_White="1" VideoShader_Black="0" VideoShader_Red="0" VideoShader_Green="0" VideoShader_Blue="0" VideoShader_Alpha="1"
        VideoShader_Saturation="1" VideoShader_CCLiftR="0" VideoShader_CCLiftG="0" VideoShader_CCLiftB="0" VideoShader_CCGammaR="1"
        VideoShader_CCGammaG="1" VideoShader_CCGammaB="1" VideoShader_CCGainR="1" VideoShader_CCGainG="1" VideoShader_CCGainB="1"
        VideoShader_Saturation2="0" VideoShader_Hue="0" VideoShader_Rec601Fix="False" VideoShader_ColorKey="0" VideoShader_Deinterlace="False"
        VideoShader_Sharpen="False" VideoShader_ToleranceRed="0" VideoShader_ToleranceGreen="0" VideoShader_ToleranceBlue="0"
        VideoShader_ToleranceGreenGap="0" VideoShader_GreenFilter="False" VideoShader_GreenFilterTransparencyThreshold="1"
        VideoShader_LumaKeyThreshold="0" VideoShader_AntiAliasing="False" VideoShader_AntiAliasingFilter="0" VideoShader_ClippingX1="0"
        VideoShader_ClippingX2="1" VideoShader_ClippingY1="0" VideoShader_ClippingY2="1" VideoShader_PremultipliedAlpha="False">${file.path}</Input>`;
}

function getVirtualInput(file: { id: string; newId: string }, layers: string[] = []) {
    const layersText = layers.map((layer, i) => `Overlay${i}="${layer}"`).join('');

    return `<Input Type="22" Position="0" RangeStart="0" RangeStop="0" State="1" OriginalTitle="" 
        ShortcutMappings="" Key="${file.newId}" Loop="False" VolumeF="1" Muted="True" BalanceF="0" AspectRatio="100"
        Category="0" MouseClickAction="0" GOClickAction="20" Collapsed="False" Solo="False" BusMVolumeF="1"
        HeadphonesVolumeF="1" BusAVolumeF="1" BusBVolumeF="1" BusCVolumeF="1" BusDVolumeF="1" BusEVolumeF="1"
        BusFVolumeF="1" BusGVolumeF="1" BusMaster="True" FrameDelay="0"  TallyCOMPort="None" TallyNumber="0"
        AutoAudioMixing="True" AutoPause="True" AutoRestart="True" AutoPlay="True" Mirror="False" SelectedIndex="0"
        Rate="1" FlattenLayers="False" ${layersText} XML="" ShaderSource="${file.id}"
        PTZProvider="" PTZConnection="" PTZAutoConnect="False" PTZDefaultPanTiltSpeed="0.5" PTZDefaultZoomSpeed="0.5"
        PTZDefaultPositionSpeed="1" PTZDefaultFocusSpeed="0.5" PTZDefaultFocusEnabled="False" PTZDefaultTallyEnabled="False"
        PTZAlwaysShowThumbnail="False" VirtualInputKey="${file.id}" UseSourceRenderEffects="True"
        VideoShader_ColorCorrectionSourceEnabled="-1" VideoShader_White="1" VideoShader_Black="0" VideoShader_Red="0"
        VideoShader_Green="0" VideoShader_Blue="0" VideoShader_Alpha="1" VideoShader_Saturation="1" VideoShader_CCLiftR="0"
        VideoShader_CCLiftG="0" VideoShader_CCLiftB="0" VideoShader_CCGammaR="1" VideoShader_CCGammaG="1" VideoShader_CCGammaB="1"
        VideoShader_CCGainR="1" VideoShader_CCGainG="1" VideoShader_CCGainB="1" VideoShader_Saturation2="0" VideoShader_Hue="0"
        VideoShader_Rec601Fix="False" VideoShader_ColorKey="0" VideoShader_Deinterlace="False" VideoShader_Sharpen="False"
        VideoShader_ToleranceRed="0" VideoShader_ToleranceGreen="0" VideoShader_ToleranceBlue="0" VideoShader_ToleranceGreenGap="0"
        VideoShader_GreenFilter="False" VideoShader_GreenFilterTransparencyThreshold="1" VideoShader_LumaKeyThreshold="0"
        VideoShader_AntiAliasing="False" VideoShader_AntiAliasingFilter="0" VideoShader_ClippingX1="0" VideoShader_ClippingX2="1"
        VideoShader_ClippingY1="0" VideoShader_ClippingY2="1" VideoShader_PremultipliedAlpha="False">
  </Input>`;
}
