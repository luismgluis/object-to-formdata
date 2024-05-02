function isUndefined(value) {
  return value === undefined;
}

function isNull(value) {
  return value === null;
}

function isBoolean(value) {
  return typeof value === 'boolean';
}

function isObject(value) {
  return value === Object(value);
}

function isArray(value) {
  return Array.isArray(value);
}

function isDate(value) {
  return value instanceof Date;
}

function isNumber(value) {
  return typeof value === 'number';
}

function isBlob(value, isReactNative) {
  return isReactNative
    ? isObject(value) && !isUndefined(value.uri)
    : isObject(value) &&
        typeof value.size === 'number' &&
        typeof value.type === 'string' &&
        typeof value.slice === 'function';
}

function isFile(value, isReactNative) {
  return (
    isBlob(value, isReactNative) &&
    typeof value.name === 'string' &&
    (isObject(value.lastModifiedDate) || typeof value.lastModified === 'number')
  );
}

function initCfg(value) {
  return isUndefined(value) ? false : value;
}

function serialize(obj, cfg, fd, pre, isInit = true) {
  cfg = cfg || {};
  fd = fd || new FormData();
  cfg.objResult = cfg.objResult || {};
  fd.customAppend = (key, value) => {
    cfg.objResult[key] = value;
    fd.append(key, value);
  };

  cfg.indices = initCfg(cfg.indices);
  cfg.nullsAsUndefineds = initCfg(cfg.nullsAsUndefineds);
  cfg.booleansAsIntegers = initCfg(cfg.booleansAsIntegers);
  cfg.allowEmptyArrays = initCfg(cfg.allowEmptyArrays);
  cfg.noAttributesWithArrayNotation = initCfg(
    cfg.noAttributesWithArrayNotation,
  );
  cfg.noFilesWithArrayNotation = initCfg(cfg.noFilesWithArrayNotation);
  cfg.dotsForObjectNotation = initCfg(cfg.dotsForObjectNotation);

  const isReactNative = typeof fd.getParts === 'function';
  if (isNumber(obj)) {
    return fd.customAppend('+' + pre, obj);
  } else if (isUndefined(obj)) {
    return fd;
  } else if (isNull(obj)) {
    if (!cfg.nullsAsUndefineds) {
      fd.customAppend('-' + pre, '');
    }
  } else if (isBoolean(obj)) {
    if (cfg.booleansAsIntegers) {
      fd.customAppend('&' + pre, obj ? 1 : 0);
    } else {
      fd.customAppend('&' + pre, obj);
    }
  } else if (isArray(obj)) {
    if (obj.length) {
      obj.forEach((value, index) => {
        let key = pre + '[' + (cfg.indices ? index : '') + ']';

        if (
          cfg.noAttributesWithArrayNotation ||
          (cfg.noFilesWithArrayNotation && isFile(value, isReactNative))
        ) {
          key = pre;
        }

        serialize(value, cfg, fd, key, false);
      });
    } else if (cfg.allowEmptyArrays) {
      fd.customAppend(cfg.noAttributesWithArrayNotation ? pre : pre + '[]', '');
    }
  } else if (isDate(obj)) {
    fd.customAppend(pre, obj.toISOString());
  } else if (isObject(obj) && !isBlob(obj, isReactNative)) {
    Object.keys(obj).forEach((prop) => {
      const value = obj[prop];

      if (isArray(value)) {
        while (prop.length > 2 && prop.lastIndexOf('[]') === prop.length - 2) {
          prop = prop.substring(0, prop.length - 2);
        }
      }

      const key = pre
        ? cfg.dotsForObjectNotation
          ? pre + '.' + prop
          : pre + '[' + prop + ']'
        : prop;

      serialize(value, cfg, fd, key, false);
    });
  } else {
    fd.customAppend(pre, obj);
  }
  if (cfg.getObj && isInit) {
    if (typeof cfg.getObj === 'function') cfg.getObj(cfg.objResult);
  }
  return fd;
}

function deserialize(objSerialize = {}) {
  const body = { ...objSerialize };
  for (const key in body) {
    if (typeof body[key] !== 'undefined') {
      const originalKey = key;

      // Verifica si la clave tiene un prefijo específico y realiza la actualización correspondiente
      if (key.startsWith('+')) {
        body[key.slice(1)] = parseFloat(body[key]);
        delete body[originalKey];
      } else if (key.startsWith('&')) {
        body[key.slice(1)] = body[key] === 'true';
        delete body[originalKey];
      } else if (key.startsWith('-')) {
        body[key.slice(1)] = null;
        delete body[originalKey];
      }
    }
  }
  const organizeObject = (data) => {
    const result = {};

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const value = data[key];
        const keys = key.split('.');

        const organizeNested = (obj, keysArray) => {
          const currentKey = keysArray.shift();
          if (!currentKey) return;
          const arrayIndexMatch = currentKey.match(/(\w+)\[(\d+)\]/);
          if (arrayIndexMatch) {
            const isArrayOneDimension = keysArray.length === 0;

            const arrayKey = arrayIndexMatch[1];
            const arrayIndex = parseInt(arrayIndexMatch[2], 10);
            obj[arrayKey] = obj[arrayKey] || [];
            obj[arrayKey][arrayIndex] = isArrayOneDimension ? value : obj[arrayKey][arrayIndex] || {};
            if (!isArrayOneDimension)
              organizeNested(obj[arrayKey][arrayIndex], keysArray);
          } else {
            if (keysArray.length === 0) {
              obj[currentKey] = value;
            } else {
              obj[currentKey] = obj[currentKey] || {};
              organizeNested(obj[currentKey], keysArray);
            }
          }
        };

        organizeNested(result, keys);
      }
    }

    return result;
  };
  const newBody = organizeObject(body);
  return newBody;
}

module.exports = {
  serialize,
  deserialize,
};
