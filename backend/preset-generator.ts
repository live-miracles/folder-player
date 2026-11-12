import fs from 'fs';
import path from 'path';

import { getFolderState } from './config-api.js';
import { FILE_TYPES } from './file-manager.js';
import type { ItemOptions } from './config-file.js';
import { addInputs, type BasePreset } from './base-preset.js';
import type { PlaylistItem } from './playlist.js';
import type { Alert } from './types.js';

type PresetFile = { path: string; type: string; id: string };
const MAX_TRAVERSED_DIRECTORIES = 1000;
const MAX_DIRECTORY_ENTRIES = 1000;

export function createPresetFileRecursively(
    folderPath: string,
    enableBus: string,
    collapse: boolean,
    customParentFolder = '',
) {
    const resolvedFolderPath = path.resolve(folderPath);
    if (path.parse(resolvedFolderPath).root === resolvedFolderPath) {
        throw new Error('Please select a content folder instead of a filesystem root.');
    }

    const report: { folder: string; baseFile: string | null; alerts: Alert[] }[] = [];
    let traversedDirectories = 0;

    function traverseDirectory(currentPath: string) {
        traversedDirectories++;
        if (traversedDirectories > MAX_TRAVERSED_DIRECTORIES) {
            throw new Error(
                `The selected folder contains more than ${MAX_TRAVERSED_DIRECTORIES} directories. Please select a more specific content folder.`,
            );
        }

        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        if (entries.length > MAX_DIRECTORY_ENTRIES) {
            throw new Error(
                `The folder '${currentPath}' contains more than ${MAX_DIRECTORY_ENTRIES} entries. Please select a more specific content folder.`,
            );
        }

        const state = getFolderState(currentPath);
        if (state.config !== null) {
            if (state.basePreset.status === 'found') {
                createPresetFile(
                    currentPath,
                    state.basePreset,
                    state.items,
                    enableBus,
                    collapse,
                    customParentFolder,
                );
            }
            report.push({ folder: currentPath, baseFile: state.baseFile, alerts: state.alerts });
        }

        // Iterate through entries to find subdirectories and recurse
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const subfolderPath = path.join(currentPath, entry.name);
                traverseDirectory(subfolderPath);
            }
        }
    }

    // Start the traversal from the initial folderPath provided
    traverseDirectory(folderPath);

    return report;
}

function createPresetFile(
    folderPath: string,
    base: Extract<BasePreset, { status: 'found' }>,
    items: PlaylistItem[],
    enableBus: string,
    collapse: boolean,
    customParentFolder: string,
) {
    console.log('Reading base file: ' + base.path);
    const rewriteSourceParent = path.dirname(path.dirname(base.path));
    const rewriteFilePath = getFilePathRewriter(rewriteSourceParent, customParentFolder);

    const inputsXML: string[] = [];
    const overlayInputsXML: string[] = [];

    for (const item of items) {
        const { options } = item;
        const overlay = item.overlay ? rewriteFilePath(item.overlay) : null;
        const layerKeys = item.layers
            .map((layer) => {
                if (layer === 'mic') return base.micKey;
                if (layer === 'cam') return base.camKey;
                return overlay?.id ?? null;
            })
            .filter((key): key is string => key !== null);

        // An overlay is its own collapsed input, shown as a layer of the item's input
        if (overlay) overlayInputsXML.push(getFileXML(overlay, [], options, true, enableBus));

        if (item.input.kind === 'colour') {
            inputsXML.push(getColorXML(item.input.title, layerKeys, collapse));
        } else {
            const files = item.input.kind === 'file' ? [item.input.file] : item.files;
            for (const file of files) {
                inputsXML.push(
                    getFileXML(rewriteFilePath(file), layerKeys, options, collapse, enableBus),
                );
            }
        }
    }

    const folderName = path.basename(folderPath);
    const outputPath = path.join(folderPath, `${folderName}.vmix`);
    fs.writeFileSync(outputPath, addInputs(base.xml, [...inputsXML, ...overlayInputsXML]), 'utf-8');
}

export function getRewrittenFilePath(
    filePath: string,
    sourceParentPath: string,
    customParentFolder: string,
) {
    const replacementParent = customParentFolder.trim();
    if (!replacementParent) return filePath;

    const relativePath = path.relative(sourceParentPath, filePath);
    const isOutsideBaseParent =
        relativePath === '' ||
        relativePath === '..' ||
        relativePath.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativePath);

    if (isOutsideBaseParent) return filePath;

    return path.join(replacementParent, relativePath);
}

function getFilePathRewriter(sourceParentPath: string, customParentFolder: string) {
    return (file: PresetFile): PresetFile => ({
        ...file,
        path: getRewrittenFilePath(file.path, sourceParentPath, customParentFolder),
    });
}

// ===== XML Inputs =====

function escapeXML(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&apos;');
}

function getLayersText(layers: string[]) {
    return layers.map((layer, i) => `Overlay${i}="${layer}"`).join(' ');
}

function getAudioOptions(volume: number) {
    const fraq = (volume / 100).toFixed(2);
    return {
        volume: volume > 100 ? '1' : fraq,
        gain: volume > 100 ? fraq : '1',
    };
}

function getFileXML(
    file: PresetFile,
    layers: string[],
    options: ItemOptions,
    isCollapsed: boolean,
    enableBus: string,
) {
    if (file.type === FILE_TYPES.IMAGE) {
        return getImageXML(file, layers, isCollapsed);
    } else if (file.type === FILE_TYPES.VIDEO) {
        return getVideoXML(file, layers, options, isCollapsed, enableBus);
    } else if (file.type === FILE_TYPES.AUDIO) {
        return getAudioXML(file, layers, options, isCollapsed, enableBus);
    } else if (file.type === FILE_TYPES.FOLDER) {
        return getPhotosXML(file, layers, options, isCollapsed);
    } else if (file.type === FILE_TYPES.POWERPOINT) {
        return getPptxInput(file, layers, options, isCollapsed);
    }

    return '';
}

function getImageXML(file: { path: string; id: string }, layers: string[], isCollapsed: boolean) {
    const collapsed = isCollapsed ? 'True' : 'False';

    return `<Input Type="1" Position="0" RangeStart="0" RangeStop="0" State="1" OriginalTitle=""
      ShortcutMappings="" Key="${file.id}" Loop="False" VolumeF="1" Muted="True"
      BalanceF="0" AspectRatio="100" Category="0" MouseClickAction="0" GOClickAction="20" Collapsed="${collapsed}"
      Solo="False" BusMVolumeF="1" HeadphonesVolumeF="1" BusAVolumeF="1" BusBVolumeF="1" BusCVolumeF="1"
      BusDVolumeF="1" BusEVolumeF="1" BusFVolumeF="1" BusGVolumeF="1" BusMaster="True" FrameDelay="0"
      TallyNumber="0" AutoAudioMixing="True" AutoPause="True" AutoRestart="False" AutoPlay="True" Mirror="False"
      SelectedIndex="0" Rate="1" FlattenLayers="False" ${getLayersText(layers)} VideoShader_ClippingX1="0"
      VideoShader_ClippingX2="1" VideoShader_ClippingY1="0" VideoShader_ClippingY2="1">${escapeXML(file.path)}</Input>`;
}

function getVideoXML(
    file: { path: string; id: string },
    layers: string[],
    options: ItemOptions,
    isCollapsed: boolean,
    enableBus: string,
) {
    const { volume, gain } = getAudioOptions(options.volume);
    const loop = options.loop ? 'True' : 'False';
    const enableBusText = enableBus ? `Bus${enableBus}="True"` : '';
    const collapsed = isCollapsed ? 'True' : 'False';

    return `<Input Type="0" Position="0" RangeStart="0" RangeStop="0" State="1" OriginalTitle=""
        ShortcutMappings="" Key="${file.id}" Loop="${loop}" VolumeF="${volume}" Muted="True" BalanceF="0" AspectRatio="100" Category="0"
        MouseClickAction="0" GOClickAction="20" Collapsed="${collapsed}" SoloPFLMode="False" MetersPF="False" Solo="False" BusMVolumeF="1"
        HeadphonesVolumeF="1" BusAVolumeF="1" BusBVolumeF="1" BusCVolumeF="1" BusDVolumeF="1" BusEVolumeF="1" BusFVolumeF="1" BusGVolumeF="1"
        MixerCollapsed="False" MixerVisible="True" AudioBusExtended="False" AudioDelay="0" AudioChannel="0" AudioGain="${gain}" AudioPad="False"
        AudioCompressorEnabled="False" AudioCompressorRatio="1" AudioCompressorThreshold="0.1258925" AudioNoiseGateEnabled="False"
        AudioNoiseGateThreshold="0" AudioEQEnabled="False" AudioEQGainDB0="0" AudioEQGainDB1="0" AudioEQGainDB2="0" AudioEQGainDB3="0"
        AudioEQGainDB4="0" AudioEQGainDB5="0" AudioEQGainDB6="0" AudioEQGainDB7="0" AudioEQGainDB8="0" AudioEQGainDB9="0" AudioAGCEnabled="False"
        AudioRackXML="&lt;plugins /&gt;" BusMaster="True" ${enableBusText} FrameDelay="0" TallyCOMPort="None" TallyNumber="0" AutoAudioMixing="True"
        AutoPause="True" AutoRestart="True" AutoPlay="True" Mirror="False" SelectedIndex="0" Rate="1" FlattenLayers="False" ${getLayersText(layers)} XML=""
        ShaderSource="00000000-0000-0000-0000-000000000000" PTZProvider="" PTZConnection="" PTZAutoConnect="False" PTZDefaultPanTiltSpeed="0.5"
        PTZDefaultZoomSpeed="0.5" PTZDefaultPositionSpeed="1" PTZDefaultFocusSpeed="0.5" PTZDefaultFocusEnabled="False" PTZDefaultTallyEnabled="False"
        PTZAlwaysShowThumbnail="False" VideoInterlaced="False" VideoShader_ColorCorrectionSourceEnabled="0" VideoShader_White="1" VideoShader_Black="0"
        VideoShader_Red="0" VideoShader_Green="0" VideoShader_Blue="0" VideoShader_Alpha="1" VideoShader_Saturation="1" VideoShader_CCLiftR="0"
        VideoShader_CCLiftG="0" VideoShader_CCLiftB="0" VideoShader_CCGammaR="1" VideoShader_CCGammaG="1" VideoShader_CCGammaB="1" VideoShader_CCGainR="1"
        VideoShader_CCGainG="1" VideoShader_CCGainB="1" VideoShader_Saturation2="0" VideoShader_Hue="0" VideoShader_Rec601Fix="False" VideoShader_ColorKey="0"
        VideoShader_Deinterlace="False" VideoShader_Sharpen="False" VideoShader_ToleranceRed="0" VideoShader_ToleranceGreen="0" VideoShader_ToleranceBlue="0"
        VideoShader_ToleranceGreenGap="0" VideoShader_GreenFilter="False" VideoShader_GreenFilterTransparencyThreshold="1" VideoShader_LumaKeyThreshold="0"
        VideoShader_AntiAliasing="False" VideoShader_AntiAliasingFilter="0" VideoShader_ClippingX1="0" VideoShader_ClippingX2="1" VideoShader_ClippingY1="0"
        VideoShader_ClippingY2="1" VideoShader_PremultipliedAlpha="False">${escapeXML(file.path)}</Input>`;
}

function getAudioXML(
    file: { path: string; id: string },
    layers: string[],
    options: ItemOptions,
    isCollapsed: boolean,
    enableBus: string,
) {
    const { volume, gain } = getAudioOptions(options.volume);
    const loop = options.loop ? 'True' : 'False';
    const enableBusText = enableBus ? `Bus${enableBus}="True"` : '';
    const collapsed = isCollapsed ? 'True' : 'False';

    return `<Input Type="13" Position="0" RangeStart="0" RangeStop="0" State="1" OriginalTitle=""
        ShortcutMappings="" Key="${file.id}" Loop="${loop}" VolumeF="${volume}" Muted="True" BalanceF="0" AspectRatio="100"
        Category="0" MouseClickAction="0" GOClickAction="20" Collapsed="${collapsed}" SoloPFLMode="False" MetersPF="False" Solo="False"
        BusMVolumeF="1" HeadphonesVolumeF="1" BusAVolumeF="1" BusBVolumeF="1" BusCVolumeF="1" BusDVolumeF="1" BusEVolumeF="1"
        BusFVolumeF="1" BusGVolumeF="1" MixerCollapsed="False" MixerVisible="True" AudioBusExtended="False" AudioDelay="0"
        AudioChannel="0" AudioGain="${gain}" AudioPad="False" AudioCompressorEnabled="False" AudioCompressorRatio="1"
        AudioCompressorThreshold="0.1258925" AudioNoiseGateEnabled="False" AudioNoiseGateThreshold="0" AudioEQEnabled="False"
        AudioEQGainDB0="0" AudioEQGainDB1="0" AudioEQGainDB2="0" AudioEQGainDB3="0" AudioEQGainDB4="0" AudioEQGainDB5="0"
        AudioEQGainDB6="0" AudioEQGainDB7="0" AudioEQGainDB8="0" AudioEQGainDB9="0" AudioAGCEnabled="False" AudioRackXML="&lt;plugins /&gt;"
        BusMaster="True" ${enableBusText} FrameDelay="0" TallyCOMPort="None" TallyNumber="0" AutoAudioMixing="True" AutoPause="True"
        AutoRestart="True" AutoPlay="True" Mirror="False" SelectedIndex="0" Rate="1" FlattenLayers="False" ${getLayersText(layers)}
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
        VideoShader_ClippingY2="1" VideoShader_PremultipliedAlpha="False">${escapeXML(file.path)}</Input>`;
}

function getPhotosXML(
    file: { path: string; id: string },
    layers: string[],
    options: ItemOptions,
    isCollapsed: boolean,
) {
    const time = options.seconds;
    const collapsed = isCollapsed ? 'True' : 'False';

    return `<Input Type="2" Position="0" RangeStart="0" RangeStop="0" State="1" OriginalTitle=""
        ShortcutMappings="" Key="${file.id}" Loop="True" VolumeF="1" Muted="True" BalanceF="0" AspectRatio="100" Category="0"
        MouseClickAction="0" GOClickAction="20" Collapsed="${collapsed}" Solo="False" BusMVolumeF="1" HeadphonesVolumeF="1" BusAVolumeF="1"
        BusBVolumeF="1" BusCVolumeF="1" BusDVolumeF="1" BusEVolumeF="1" BusFVolumeF="1" BusGVolumeF="1" BusMaster="True" FrameDelay="0"
        TallyCOMPort="None" TallyNumber="0" AutoAudioMixing="True" AutoPause="True" AutoRestart="True" AutoPlay="False" Mirror="False"
        SelectedIndex="1" Rate="1" FlattenLayers="False" ${getLayersText(layers)} XML="&lt;indexMappings /&gt;" ShaderSource="00000000-0000-0000-0000-000000000000"
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
        VideoShader_ClippingX2="1" VideoShader_ClippingY1="0" VideoShader_ClippingY2="1" VideoShader_PremultipliedAlpha="False">${escapeXML(file.path)}</Input>`;
}

function getColorXML(name: string, layers: string[], isCollapsed: boolean) {
    const collapsed = isCollapsed ? 'True' : 'False';

    return `<Input Type="12" Position="0" RangeStart="0" RangeStop="0" State="1" Title="${name}" OriginalTitle="Colour" ShortcutMappings=""
        Key="${crypto.randomUUID()}" Loop="False" VolumeF="1" Muted="True" BalanceF="0" AspectRatio="100" Category="0" MouseClickAction="0"
        GOClickAction="20" Collapsed="${collapsed}" Solo="False" BusMVolumeF="1" HeadphonesVolumeF="1" BusAVolumeF="1" BusBVolumeF="1" BusCVolumeF="1"
        BusDVolumeF="1" BusEVolumeF="1" BusFVolumeF="1" BusGVolumeF="1" BusMaster="True" FrameDelay="0" TallyCOMPort="None" TallyNumber="0"
        AutoAudioMixing="True" AutoPause="True" AutoRestart="False" AutoPlay="True" Mirror="False" SelectedIndex="0" Rate="1" FlattenLayers="False"
        ${getLayersText(layers)} MasterOverlayLast8="True" XML="" ShaderSource="00000000-0000-0000-0000-000000000000"
        PTZProvider="" PTZConnection="" PTZAutoConnect="False" PTZDefaultPanTiltSpeed="0.5" PTZDefaultZoomSpeed="0.5" PTZDefaultPositionSpeed="1"
        PTZDefaultFocusSpeed="0.5" PTZDefaultFocusEnabled="False" PTZDefaultTallyEnabled="False" PTZAlwaysShowThumbnail="False" Colour="-16777216"
        ColourBars="False" VideoShader_ColorCorrectionSourceEnabled="0" VideoShader_White="1" VideoShader_Black="0" VideoShader_Red="0" VideoShader_Green="0"
        VideoShader_Blue="0" VideoShader_Alpha="1" VideoShader_Saturation="1" VideoShader_CCLiftR="0" VideoShader_CCLiftG="0" VideoShader_CCLiftB="0"
        VideoShader_CCGammaR="1" VideoShader_CCGammaG="1" VideoShader_CCGammaB="1" VideoShader_CCGainR="1" VideoShader_CCGainG="1" VideoShader_CCGainB="1"
        VideoShader_Saturation2="0" VideoShader_Hue="0" VideoShader_Rec601Fix="False" VideoShader_ColorKey="0" VideoShader_Deinterlace="False"
        VideoShader_Sharpen="False" VideoShader_ToleranceRed="0" VideoShader_ToleranceGreen="0" VideoShader_ToleranceBlue="0"
        VideoShader_ToleranceGreenGap="0" VideoShader_GreenFilter="False" VideoShader_GreenFilterTransparencyThreshold="1" VideoShader_LumaKeyThreshold="0"
        VideoShader_AntiAliasing="False" VideoShader_AntiAliasingFilter="0" VideoShader_ClippingX1="0" VideoShader_ClippingX2="1" VideoShader_ClippingY1="0"
        VideoShader_ClippingY2="1" VideoShader_PremultipliedAlpha="False"></Input>`;
}

function getPptxInput(
    file: { path: string; id: string },
    layers: string[],
    options: ItemOptions,
    isCollapsed: boolean,
) {
    const time = options.seconds;
    const collapsed = isCollapsed ? 'True' : 'False';

    return `<Input Type="3" Position="0" RangeStart="0" RangeStop="0" State="1" OriginalTitle="Practice Instructions Module.pptx" ShortcutMappings=""
      Key="${file.id}" Loop="True" VolumeF="1" Muted="True" BalanceF="0" AspectRatio="100" Category="0" MouseClickAction="0"
      GOClickAction="20" Collapsed="${collapsed}" Solo="False" BusMVolumeF="1" HeadphonesVolumeF="1" BusAVolumeF="1" BusBVolumeF="1" BusCVolumeF="1" BusDVolumeF="1"
      BusEVolumeF="1" BusFVolumeF="1" BusGVolumeF="1" BusMaster="True" FrameDelay="0" TallyCOMPort="None" TallyNumber="0" AutoAudioMixing="True" AutoPause="True"
      AutoRestart="True" AutoPlay="False" Mirror="False" SelectedIndex="1" Rate="1" FlattenLayers="False" ${getLayersText(layers)} XML="&lt;indexMappings /&gt;"
      ShaderSource="00000000-0000-0000-0000-000000000000" PTZProvider="" PTZConnection="" PTZAutoConnect="False" PTZDefaultPanTiltSpeed="0.5" PTZDefaultZoomSpeed="0.5"
      PTZDefaultPositionSpeed="1" PTZDefaultFocusSpeed="0.5" PTZDefaultFocusEnabled="False" PTZDefaultTallyEnabled="False" PTZAlwaysShowThumbnail="False"
      PictureTransition="${String(time)}" PictureDuration="500" PictureEffect="0" PictureBlackBorders="True" VideoShader_ColorCorrectionSourceEnabled="0" VideoShader_White="1"
      VideoShader_Black="0" VideoShader_Red="0" VideoShader_Green="0" VideoShader_Blue="0" VideoShader_Alpha="1" VideoShader_Saturation="1" VideoShader_CCLiftR="0"
      VideoShader_CCLiftG="0" VideoShader_CCLiftB="0" VideoShader_CCGammaR="1" VideoShader_CCGammaG="1" VideoShader_CCGammaB="1" VideoShader_CCGainR="1"
      VideoShader_CCGainG="1" VideoShader_CCGainB="1" VideoShader_Saturation2="0" VideoShader_Hue="0" VideoShader_Rec601Fix="False" VideoShader_ColorKey="0"
      VideoShader_Deinterlace="False" VideoShader_Sharpen="False" VideoShader_ToleranceRed="0" VideoShader_ToleranceGreen="0" VideoShader_ToleranceBlue="0"
      VideoShader_ToleranceGreenGap="0" VideoShader_GreenFilter="False" VideoShader_GreenFilterTransparencyThreshold="1" VideoShader_LumaKeyThreshold="0"
      VideoShader_AntiAliasing="False" VideoShader_AntiAliasingFilter="0" VideoShader_ClippingX1="0" VideoShader_ClippingX2="1" VideoShader_ClippingY1="0"
      VideoShader_ClippingY2="1" VideoShader_PremultipliedAlpha="False">${escapeXML(file.path)}</Input>`;
}
