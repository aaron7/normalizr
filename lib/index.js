'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.arrayOf = arrayOf;
exports.valuesOf = valuesOf;
exports.unionOf = unionOf;
exports.normalize = normalize;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _EntitySchema = require('./EntitySchema');

var _EntitySchema2 = _interopRequireDefault(_EntitySchema);

var _IterableSchema = require('./IterableSchema');

var _IterableSchema2 = _interopRequireDefault(_IterableSchema);

var _UnionSchema = require('./UnionSchema');

var _UnionSchema2 = _interopRequireDefault(_UnionSchema);

var _lodashClone = require('lodash/clone');

var _lodashClone2 = _interopRequireDefault(_lodashClone);

var _lodashIsObject = require('lodash/isObject');

var _lodashIsObject2 = _interopRequireDefault(_lodashIsObject);

var _lodashIsEqual = require('lodash/isEqual');

var _lodashIsEqual2 = _interopRequireDefault(_lodashIsEqual);

var _lodashMapValues = require('lodash/mapValues');

var _lodashMapValues2 = _interopRequireDefault(_lodashMapValues);

function defaultAssignEntity(normalized, key, entity) {
  normalized[key] = entity;
}

function visitObject(obj, schema, bag, options) {
  var _options$assignEntity = options.assignEntity;
  var assignEntity = _options$assignEntity === undefined ? defaultAssignEntity : _options$assignEntity;

  var normalized = {};
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      var entity = visit(obj[key], schema[key], bag, _extends({}, options, {
        parentId: schema.getId ? schema.getId(obj) : undefined
      }));
      assignEntity.call(null, normalized, key, entity);
    }
  }
  return normalized;
}

function defaultMapper(iterableSchema, itemSchema, bag, options) {
  return function (obj) {
    return visit(obj, itemSchema, bag, options);
  };
}

function polymorphicMapper(iterableSchema, itemSchema, bag, options) {
  return function (obj) {
    var schemaKey = iterableSchema.getSchemaKey(obj);
    var result = visit(obj, itemSchema[schemaKey], bag, options);
    return { id: result, schema: schemaKey };
  };
}

function visitIterable(obj, iterableSchema, bag, options) {
  var itemSchema = iterableSchema.getItemSchema();
  if (iterableSchema._mappedBy) {
    itemSchema = _lodashClone2['default'](itemSchema).mappedBy(iterableSchema._mappedBy);
  }
  var curriedItemMapper = defaultMapper(iterableSchema, itemSchema, bag, options);

  if (Array.isArray(obj)) {
    return obj.map(curriedItemMapper);
  } else {
    return _lodashMapValues2['default'](obj, curriedItemMapper);
  }
}

function visitUnion(obj, unionSchema, bag, options) {
  var itemSchema = unionSchema.getItemSchema();
  return polymorphicMapper(unionSchema, itemSchema, bag, options)(obj);
}

function defaultMergeIntoEntity(entityA, entityB, entityKey) {
  for (var key in entityB) {
    if (!entityB.hasOwnProperty(key)) {
      continue;
    }

    if (!entityA.hasOwnProperty(key) || _lodashIsEqual2['default'](entityA[key], entityB[key])) {
      entityA[key] = entityB[key];
      continue;
    }

    console.warn('When merging two ' + entityKey + ', found unequal data in their "' + key + '" values. Using the earlier value.', entityA[key], entityB[key]);
  }
}

function visitEntity(entity, entitySchema, bag, options) {
  var _options$mergeIntoEntity = options.mergeIntoEntity;
  var mergeIntoEntity = _options$mergeIntoEntity === undefined ? defaultMergeIntoEntity : _options$mergeIntoEntity;

  var entityKey = entitySchema.getKey();
  var id = entitySchema.getId(entity);

  if (!bag.hasOwnProperty(entityKey)) {
    bag[entityKey] = {};
  }

  if (!bag[entityKey].hasOwnProperty(id)) {
    bag[entityKey][id] = {};
  }

  var stored = bag[entityKey][id];
  var normalized = visitObject(entity, entitySchema, bag, options);
  mergeIntoEntity(stored, normalized, entityKey);

  if (entitySchema._mappedBy) {
    var fk = entitySchema._mappedBy;
    if (entitySchema[fk] instanceof _IterableSchema2['default'] && options.parentId) {
      if (!stored[fk]) {
        stored[fk] = [];
      }
      stored[fk] = Array.from(new Set([].concat(stored[fk], [options.parentId])));
    } else if (options.parentId && !stored[fk]) {
      stored[fk] = options.parentId;
    }
  }

  return id;
}

function visit(obj, schema, bag, options) {
  if (!_lodashIsObject2['default'](schema)) {
    return obj;
  }

  if (!_lodashIsObject2['default'](obj) && schema._mappedBy) {
    var _obj;

    obj = (_obj = {}, _obj[schema.getIdAttribute()] = obj, _obj);
  } else if (!_lodashIsObject2['default'](obj)) {
    return obj;
  }

  if (schema instanceof _EntitySchema2['default']) {
    return visitEntity(obj, schema, bag, options);
  } else if (schema instanceof _IterableSchema2['default']) {
    return visitIterable(obj, schema, bag, options);
  } else if (schema instanceof _UnionSchema2['default']) {
    return visitUnion(obj, schema, bag, options);
  } else {
    return visitObject(obj, schema, bag, options);
  }
}

function arrayOf(schema, options) {
  return new _IterableSchema2['default'](schema, options);
}

function valuesOf(schema, options) {
  return new _IterableSchema2['default'](schema, options);
}

function unionOf(schema, options) {
  return new _UnionSchema2['default'](schema, options);
}

exports.Schema = _EntitySchema2['default'];

function normalize(obj, schema) {
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  if (!_lodashIsObject2['default'](obj) && !Array.isArray(obj)) {
    throw new Error('Normalize accepts an object or an array as its input.');
  }

  if (!_lodashIsObject2['default'](schema) || Array.isArray(schema)) {
    throw new Error('Normalize accepts an object for schema.');
  }

  var bag = {};
  var result = visit(obj, schema, bag, options);

  return {
    entities: bag,
    result: result
  };
}