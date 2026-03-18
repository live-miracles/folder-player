export function ensureArray(item: any) {
    if (item === undefined) return [];
    if (Array.isArray(item)) {
        return item;
    } else {
        return [item];
    }
}

export async function fetchUrl(url: string) {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
        const data = await response.text();
        return {
            status: response.status,
            value: data,
            error: null,
        };
    } catch (error) {
        return {
            status: null,
            value: null,
            error: error,
        };
    }
}

export function xml2json(xml: any) {
    let obj = {} as any;

    if (xml.nodeType == 1) {
        // element
        // do attributes
        if (xml.attributes.length > 0) {
            obj['@attributes'] = {};
            for (var j = 0; j < xml.attributes.length; j++) {
                var attribute = xml.attributes.item(j);
                obj['@attributes'][attribute.nodeName] = attribute.nodeValue;
            }
        }
    } else if (xml.nodeType == 3) {
        // text
        obj = xml.nodeValue;
    }

    // do children
    if (xml.hasChildNodes()) {
        for (var i = 0; i < xml.childNodes.length; i++) {
            const item = xml.childNodes.item(i);
            const nodeName = item.nodeName as string;
            if (typeof obj[nodeName] == 'undefined') {
                obj[nodeName] = xml2json(item);
            } else {
                if (typeof obj[nodeName].push == 'undefined') {
                    var old = obj[nodeName];
                    obj[nodeName] = [];
                    obj[nodeName].push(old);
                }
                obj[nodeName].push(xml2json(item));
            }
        }
    }
    return obj;
}
