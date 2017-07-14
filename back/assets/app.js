(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

class Container {
    constructor(registry, resolver = null) {
        this._registry = registry;
        this._resolver = resolver;
        this._lookups = {};
        this._factoryDefinitionLookups = {};
    }
    factoryFor(specifier) {
        let factoryDefinition = this._factoryDefinitionLookups[specifier];
        if (!factoryDefinition) {
            if (this._resolver) {
                factoryDefinition = this._resolver.retrieve(specifier);
            }
            if (!factoryDefinition) {
                factoryDefinition = this._registry.registration(specifier);
            }
            if (factoryDefinition) {
                this._factoryDefinitionLookups[specifier] = factoryDefinition;
            }
        }
        if (!factoryDefinition) {
            return;
        }
        return this.buildFactory(specifier, factoryDefinition);
    }
    lookup(specifier) {
        let singleton = this._registry.registeredOption(specifier, 'singleton') !== false;
        if (singleton && this._lookups[specifier]) {
            return this._lookups[specifier];
        }
        let factory = this.factoryFor(specifier);
        if (!factory) {
            return;
        }
        if (this._registry.registeredOption(specifier, 'instantiate') === false) {
            return factory.class;
        }
        let object = factory.create();
        if (singleton && object) {
            this._lookups[specifier] = object;
        }
        return object;
    }
    defaultInjections(specifier) {
        return {};
    }
    buildInjections(specifier) {
        let hash = this.defaultInjections(specifier);
        let injections = this._registry.registeredInjections(specifier);
        let injection;
        for (let i = 0; i < injections.length; i++) {
            injection = injections[i];
            hash[injection.property] = this.lookup(injection.source);
        }
        return hash;
    }
    buildFactory(specifier, factoryDefinition) {
        let injections = this.buildInjections(specifier);
        return {
            class: factoryDefinition,
            create(options) {
                let mergedOptions = Object.assign({}, injections, options);
                return factoryDefinition.create(mergedOptions);
            }
        };
    }
}

class Registry {
    constructor(options) {
        this._registrations = {};
        this._registeredOptions = {};
        this._registeredInjections = {};
        if (options && options.fallback) {
            this._fallback = options.fallback;
        }
    }
    register(specifier, factoryDefinition, options) {
        this._registrations[specifier] = factoryDefinition;
        if (options) {
            this._registeredOptions[specifier] = options;
        }
    }
    registration(specifier) {
        let registration = this._registrations[specifier];
        if (registration === undefined && this._fallback) {
            registration = this._fallback.registration(specifier);
        }
        return registration;
    }
    unregister(specifier) {
        delete this._registrations[specifier];
        delete this._registeredOptions[specifier];
        delete this._registeredInjections[specifier];
    }
    registerOption(specifier, option, value) {
        let options = this._registeredOptions[specifier];
        if (!options) {
            options = {};
            this._registeredOptions[specifier] = options;
        }
        options[option] = value;
    }
    registeredOption(specifier, option) {
        let result;
        let options = this.registeredOptions(specifier);
        if (options) {
            result = options[option];
        }
        if (result === undefined && this._fallback !== undefined) {
            result = this._fallback.registeredOption(specifier, option);
        }
        return result;
    }
    registeredOptions(specifier) {
        let options = this._registeredOptions[specifier];
        if (options === undefined) {
            var _specifier$split = specifier.split(':');

            let type = _specifier$split[0];

            options = this._registeredOptions[type];
        }
        return options;
    }
    unregisterOption(specifier, option) {
        let options = this._registeredOptions[specifier];
        if (options) {
            delete options[option];
        }
    }
    registerInjection(specifier, property, source) {
        let injections = this._registeredInjections[specifier];
        if (injections === undefined) {
            this._registeredInjections[specifier] = injections = [];
        }
        injections.push({
            property,
            source
        });
    }
    registeredInjections(specifier) {
        var _specifier$split2 = specifier.split(':');

        let type = _specifier$split2[0];

        let injections = this._fallback ? this._fallback.registeredInjections(specifier) : [];
        Array.prototype.push.apply(injections, this._registeredInjections[type]);
        Array.prototype.push.apply(injections, this._registeredInjections[specifier]);
        return injections;
    }
}

// TODO - use symbol
const OWNER = '__owner__';
function getOwner(object) {
    return object[OWNER];
}
function setOwner(object, owner) {
    object[OWNER] = owner;
}

// There is a small whitelist of namespaced attributes specially
// enumerated in
// https://www.w3.org/TR/html/syntax.html#attributes-0
//
// > When a foreign element has one of the namespaced attributes given by
// > the local name and namespace of the first and second cells of a row
// > from the following table, it must be written using the name given by
// > the third cell from the same row.
//
// In all other cases, colons are interpreted as a regular character
// with no special meaning:
//
// > No other namespaced attribute can be expressed in the HTML syntax.

function unwrap(val) {
    if (val === null || val === undefined) throw new Error(`Expected value to be present`);
    return val;
}
function expect(val, message) {
    if (val === null || val === undefined) throw new Error(message);
    return val;
}
function unreachable() {
    return new Error('unreachable');
}
function typePos(lastOperand) {
    return lastOperand - 4;
}

// import Logger from './logger';
// let alreadyWarned = false;
function debugAssert(test, msg) {
    // if (!alreadyWarned) {
    //   alreadyWarned = true;
    //   Logger.warn("Don't leave debug assertions on in public builds");
    // }
    if (!test) {
        throw new Error(msg || "assertion failure");
    }
}

var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Trace"] = 0] = "Trace";
    LogLevel[LogLevel["Debug"] = 1] = "Debug";
    LogLevel[LogLevel["Warn"] = 2] = "Warn";
    LogLevel[LogLevel["Error"] = 3] = "Error";
})(LogLevel || (LogLevel = {}));
class NullConsole {
    log(_message) {}
    warn(_message) {}
    error(_message) {}
    trace() {}
}
let ALWAYS;
class Logger {
    constructor({ console, level }) {
        this.f = ALWAYS;
        this.force = ALWAYS;
        this.console = console;
        this.level = level;
    }
    skipped(level) {
        return level < this.level;
    }
    trace(message, { stackTrace = false } = {}) {
        if (this.skipped(LogLevel.Trace)) return;
        this.console.log(message);
        if (stackTrace) this.console.trace();
    }
    debug(message, { stackTrace = false } = {}) {
        if (this.skipped(LogLevel.Debug)) return;
        this.console.log(message);
        if (stackTrace) this.console.trace();
    }
    warn(message, { stackTrace = false } = {}) {
        if (this.skipped(LogLevel.Warn)) return;
        this.console.warn(message);
        if (stackTrace) this.console.trace();
    }
    error(message) {
        if (this.skipped(LogLevel.Error)) return;
        this.console.error(message);
    }
}
let _console = typeof console === 'undefined' ? new NullConsole() : console;
ALWAYS = new Logger({ console: _console, level: LogLevel.Trace });
const LOG_LEVEL = LogLevel.Debug;
new Logger({ console: _console, level: LOG_LEVEL });

const objKeys = Object.keys;

function assign(obj) {
    for (let i = 1; i < arguments.length; i++) {
        let assignment = arguments[i];
        if (assignment === null || typeof assignment !== 'object') continue;
        let keys = objKeys(assignment);
        for (let j = 0; j < keys.length; j++) {
            let key = keys[j];
            obj[key] = assignment[key];
        }
    }
    return obj;
}
function fillNulls(count) {
    let arr = new Array(count);
    for (let i = 0; i < count; i++) {
        arr[i] = null;
    }
    return arr;
}

let GUID = 0;
function initializeGuid(object) {
    return object._guid = ++GUID;
}
function ensureGuid(object) {
    return object._guid || initializeGuid(object);
}

let proto = Object.create(null, {
    // without this, we will always still end up with (new
    // EmptyObject()).constructor === Object
    constructor: {
        value: undefined,
        enumerable: false,
        writable: true
    }
});
function EmptyObject() {}
EmptyObject.prototype = proto;
function dict() {
    // let d = Object.create(null);
    // d.x = 1;
    // delete d.x;
    // return d;
    return new EmptyObject();
}
class DictSet {
    constructor() {
        this.dict = dict();
    }
    add(obj) {
        if (typeof obj === 'string') this.dict[obj] = obj;else this.dict[ensureGuid(obj)] = obj;
        return this;
    }
    delete(obj) {
        if (typeof obj === 'string') delete this.dict[obj];else if (obj._guid) delete this.dict[obj._guid];
    }
    forEach(callback) {
        let dict = this.dict;

        let dictKeys = Object.keys(dict);
        for (let i = 0; dictKeys.length; i++) {
            callback(dict[dictKeys[i]]);
        }
    }
    toArray() {
        return Object.keys(this.dict);
    }
}
class Stack {
    constructor() {
        this.stack = [];
        this.current = null;
    }
    toArray() {
        return this.stack;
    }
    push(item) {
        this.current = item;
        this.stack.push(item);
    }
    pop() {
        let item = this.stack.pop();
        let len = this.stack.length;
        this.current = len === 0 ? null : this.stack[len - 1];
        return item === undefined ? null : item;
    }
    isEmpty() {
        return this.stack.length === 0;
    }
}

class ListNode {
    constructor(value) {
        this.next = null;
        this.prev = null;
        this.value = value;
    }
}
class LinkedList {
    constructor() {
        this.clear();
    }
    static fromSlice(slice) {
        let list = new LinkedList();
        slice.forEachNode(n => list.append(n.clone()));
        return list;
    }
    head() {
        return this._head;
    }
    tail() {
        return this._tail;
    }
    clear() {
        this._head = this._tail = null;
    }
    isEmpty() {
        return this._head === null;
    }
    toArray() {
        let out = [];
        this.forEachNode(n => out.push(n));
        return out;
    }
    splice(start, end, reference) {
        let before;
        if (reference === null) {
            before = this._tail;
            this._tail = end;
        } else {
            before = reference.prev;
            end.next = reference;
            reference.prev = end;
        }
        if (before) {
            before.next = start;
            start.prev = before;
        }
    }
    nextNode(node) {
        return node.next;
    }
    prevNode(node) {
        return node.prev;
    }
    forEachNode(callback) {
        let node = this._head;
        while (node !== null) {
            callback(node);
            node = node.next;
        }
    }
    contains(needle) {
        let node = this._head;
        while (node !== null) {
            if (node === needle) return true;
            node = node.next;
        }
        return false;
    }
    insertBefore(node, reference = null) {
        if (reference === null) return this.append(node);
        if (reference.prev) reference.prev.next = node;else this._head = node;
        node.prev = reference.prev;
        node.next = reference;
        reference.prev = node;
        return node;
    }
    append(node) {
        let tail = this._tail;
        if (tail) {
            tail.next = node;
            node.prev = tail;
            node.next = null;
        } else {
            this._head = node;
        }
        return this._tail = node;
    }
    pop() {
        if (this._tail) return this.remove(this._tail);
        return null;
    }
    prepend(node) {
        if (this._head) return this.insertBefore(node, this._head);
        return this._head = this._tail = node;
    }
    remove(node) {
        if (node.prev) node.prev.next = node.next;else this._head = node.next;
        if (node.next) node.next.prev = node.prev;else this._tail = node.prev;
        return node;
    }
}
class ListSlice {
    constructor(head, tail) {
        this._head = head;
        this._tail = tail;
    }
    static toList(slice) {
        let list = new LinkedList();
        slice.forEachNode(n => list.append(n.clone()));
        return list;
    }
    forEachNode(callback) {
        let node = this._head;
        while (node !== null) {
            callback(node);
            node = this.nextNode(node);
        }
    }
    contains(needle) {
        let node = this._head;
        while (node !== null) {
            if (node === needle) return true;
            node = node.next;
        }
        return false;
    }
    head() {
        return this._head;
    }
    tail() {
        return this._tail;
    }
    toArray() {
        let out = [];
        this.forEachNode(n => out.push(n));
        return out;
    }
    nextNode(node) {
        if (node === this._tail) return null;
        return node.next;
    }
    prevNode(node) {
        if (node === this._head) return null;
        return node.prev;
    }
    isEmpty() {
        return false;
    }
}
const EMPTY_SLICE = new ListSlice(null, null);

const HAS_NATIVE_WEAKMAP = function () {
    // detect if `WeakMap` is even present
    let hasWeakMap = typeof WeakMap === 'function';
    if (!hasWeakMap) {
        return false;
    }
    let instance = new WeakMap();
    // use `Object`'s `.toString` directly to prevent us from detecting
    // polyfills as native weakmaps
    return Object.prototype.toString.call(instance) === '[object WeakMap]';
}();

const HAS_TYPED_ARRAYS = typeof Uint32Array !== 'undefined';
let A;
if (HAS_TYPED_ARRAYS) {
    A = Uint32Array;
} else {
    A = Array;
}
const EMPTY_ARRAY = HAS_NATIVE_WEAKMAP ? Object.freeze([]) : [];

var Register;
(function (Register) {
    // $0 or $pc (program counter): pointer into `program` for the next insturction; -1 means exit
    Register[Register["pc"] = 0] = "pc";
    // $1 or $ra (return address): pointer into `program` for the return
    Register[Register["ra"] = 1] = "ra";
    // $2 or $fp (frame pointer): pointer into the `evalStack` for the base of the stack
    Register[Register["fp"] = 2] = "fp";
    // $3 or $sp (stack pointer): pointer into the `evalStack` for the top of the stack
    Register[Register["sp"] = 3] = "sp";
    // $4-$5 or $s0-$s1 (saved): callee saved general-purpose registers
    Register[Register["s0"] = 4] = "s0";
    Register[Register["s1"] = 5] = "s1";
    // $6-$7 or $t0-$t1 (temporaries): caller saved general-purpose registers
    Register[Register["t0"] = 6] = "t0";
    Register[Register["t1"] = 7] = "t1";
})(Register || (Register = {}));

class AppendOpcodes {
    constructor() {
        this.evaluateOpcode = fillNulls(72 /* Size */).slice();
    }
    add(name, evaluate) {
        this.evaluateOpcode[name] = evaluate;
    }
    evaluate(vm, opcode, type) {
        let func = this.evaluateOpcode[type];
        func(vm, opcode);
        
    }
}
const APPEND_OPCODES = new AppendOpcodes();
class AbstractOpcode {
    constructor() {
        initializeGuid(this);
    }
    toJSON() {
        return { guid: this._guid, type: this.type };
    }
}
class UpdatingOpcode extends AbstractOpcode {
    constructor() {
        super(...arguments);
        this.next = null;
        this.prev = null;
    }
}

const CONSTANT = 0;
const INITIAL = 1;
const VOLATILE = NaN;
class RevisionTag {
    validate(snapshot) {
        return this.value() === snapshot;
    }
}
RevisionTag.id = 0;
const VALUE = [];
const VALIDATE = [];
class TagWrapper {
    constructor(type, inner) {
        this.type = type;
        this.inner = inner;
    }
    value() {
        let func = VALUE[this.type];
        return func(this.inner);
    }
    validate(snapshot) {
        let func = VALIDATE[this.type];
        return func(this.inner, snapshot);
    }
}
function register(Type) {
    let type = VALUE.length;
    VALUE.push(tag => tag.value());
    VALIDATE.push((tag, snapshot) => tag.validate(snapshot));
    Type.id = type;
}
///
// CONSTANT: 0
VALUE.push(() => CONSTANT);
VALIDATE.push((_tag, snapshot) => snapshot === CONSTANT);
const CONSTANT_TAG = new TagWrapper(0, null);
// VOLATILE: 1
VALUE.push(() => VOLATILE);
VALIDATE.push((_tag, snapshot) => snapshot === VOLATILE);
const VOLATILE_TAG = new TagWrapper(1, null);
// CURRENT: 2
VALUE.push(() => $REVISION);
VALIDATE.push((_tag, snapshot) => snapshot === $REVISION);
const CURRENT_TAG = new TagWrapper(2, null);


function isConst({ tag }) {
    return tag === CONSTANT_TAG;
}
function isConstTag(tag) {
    return tag === CONSTANT_TAG;
}
///
let $REVISION = INITIAL;
class DirtyableTag extends RevisionTag {
    static create(revision = $REVISION) {
        return new TagWrapper(this.id, new DirtyableTag(revision));
    }
    constructor(revision = $REVISION) {
        super();
        this.revision = revision;
    }
    value() {
        return this.revision;
    }
    dirty() {
        this.revision = ++$REVISION;
    }
}
register(DirtyableTag);
function combineTagged(tagged) {
    let optimized = [];
    for (let i = 0, l = tagged.length; i < l; i++) {
        let tag = tagged[i].tag;
        if (tag === VOLATILE_TAG) return VOLATILE_TAG;
        if (tag === CONSTANT_TAG) continue;
        optimized.push(tag);
    }
    return _combine(optimized);
}
function combineSlice(slice) {
    let optimized = [];
    let node = slice.head();
    while (node !== null) {
        let tag = node.tag;
        if (tag === VOLATILE_TAG) return VOLATILE_TAG;
        if (tag !== CONSTANT_TAG) optimized.push(tag);
        node = slice.nextNode(node);
    }
    return _combine(optimized);
}
function combine(tags) {
    let optimized = [];
    for (let i = 0, l = tags.length; i < l; i++) {
        let tag = tags[i];
        if (tag === VOLATILE_TAG) return VOLATILE_TAG;
        if (tag === CONSTANT_TAG) continue;
        optimized.push(tag);
    }
    return _combine(optimized);
}
function _combine(tags) {
    switch (tags.length) {
        case 0:
            return CONSTANT_TAG;
        case 1:
            return tags[0];
        case 2:
            return TagsPair.create(tags[0], tags[1]);
        default:
            return TagsCombinator.create(tags);
    }
    
}
class CachedTag extends RevisionTag {
    constructor() {
        super(...arguments);
        this.lastChecked = null;
        this.lastValue = null;
    }
    value() {
        let lastChecked = this.lastChecked,
            lastValue = this.lastValue;

        if (lastChecked !== $REVISION) {
            this.lastChecked = $REVISION;
            this.lastValue = lastValue = this.compute();
        }
        return this.lastValue;
    }
    invalidate() {
        this.lastChecked = null;
    }
}
class TagsPair extends CachedTag {
    static create(first, second) {
        return new TagWrapper(this.id, new TagsPair(first, second));
    }
    constructor(first, second) {
        super();
        this.first = first;
        this.second = second;
    }
    compute() {
        return Math.max(this.first.value(), this.second.value());
    }
}
register(TagsPair);
class TagsCombinator extends CachedTag {
    static create(tags) {
        return new TagWrapper(this.id, new TagsCombinator(tags));
    }
    constructor(tags) {
        super();
        this.tags = tags;
    }
    compute() {
        let tags = this.tags;

        let max = -1;
        for (let i = 0; i < tags.length; i++) {
            let value = tags[i].value();
            max = Math.max(value, max);
        }
        return max;
    }
}
register(TagsCombinator);
class UpdatableTag extends CachedTag {
    static create(tag) {
        return new TagWrapper(this.id, new UpdatableTag(tag));
    }
    constructor(tag) {
        super();
        this.tag = tag;
        this.lastUpdated = INITIAL;
    }
    compute() {
        return Math.max(this.lastUpdated, this.tag.value());
    }
    update(tag) {
        if (tag !== this.tag) {
            this.tag = tag;
            this.lastUpdated = $REVISION;
            this.invalidate();
        }
    }
}
register(UpdatableTag);
class CachedReference {
    constructor() {
        this.lastRevision = null;
        this.lastValue = null;
    }
    value() {
        let tag = this.tag,
            lastRevision = this.lastRevision,
            lastValue = this.lastValue;

        if (!lastRevision || !tag.validate(lastRevision)) {
            lastValue = this.lastValue = this.compute();
            this.lastRevision = tag.value();
        }
        return lastValue;
    }
    invalidate() {
        this.lastRevision = null;
    }
}
class MapperReference extends CachedReference {
    constructor(reference, mapper) {
        super();
        this.tag = reference.tag;
        this.reference = reference;
        this.mapper = mapper;
    }
    compute() {
        let reference = this.reference,
            mapper = this.mapper;

        return mapper(reference.value());
    }
}
function map(reference, mapper) {
    return new MapperReference(reference, mapper);
}
//////////
class ReferenceCache {
    constructor(reference) {
        this.lastValue = null;
        this.lastRevision = null;
        this.initialized = false;
        this.tag = reference.tag;
        this.reference = reference;
    }
    peek() {
        if (!this.initialized) {
            return this.initialize();
        }
        return this.lastValue;
    }
    revalidate() {
        if (!this.initialized) {
            return this.initialize();
        }
        let reference = this.reference,
            lastRevision = this.lastRevision;

        let tag = reference.tag;
        if (tag.validate(lastRevision)) return NOT_MODIFIED;
        this.lastRevision = tag.value();
        let lastValue = this.lastValue;

        let value = reference.value();
        if (value === lastValue) return NOT_MODIFIED;
        this.lastValue = value;
        return value;
    }
    initialize() {
        let reference = this.reference;

        let value = this.lastValue = reference.value();
        this.lastRevision = reference.tag.value();
        this.initialized = true;
        return value;
    }
}
const NOT_MODIFIED = "adb3b78e-3d22-4e4b-877a-6317c2c5c145";
function isModified(value) {
    return value !== NOT_MODIFIED;
}

class ConstReference {
    constructor(inner) {
        this.inner = inner;
        this.tag = CONSTANT_TAG;
    }
    value() {
        return this.inner;
    }
}

class ListItem extends ListNode {
    constructor(iterable, result) {
        super(iterable.valueReferenceFor(result));
        this.retained = false;
        this.seen = false;
        this.key = result.key;
        this.iterable = iterable;
        this.memo = iterable.memoReferenceFor(result);
    }
    update(item) {
        this.retained = true;
        this.iterable.updateValueReference(this.value, item);
        this.iterable.updateMemoReference(this.memo, item);
    }
    shouldRemove() {
        return !this.retained;
    }
    reset() {
        this.retained = false;
        this.seen = false;
    }
}
class IterationArtifacts {
    constructor(iterable) {
        this.map = dict();
        this.list = new LinkedList();
        this.tag = iterable.tag;
        this.iterable = iterable;
    }
    isEmpty() {
        let iterator = this.iterator = this.iterable.iterate();
        return iterator.isEmpty();
    }
    iterate() {
        let iterator = this.iterator || this.iterable.iterate();
        this.iterator = null;
        return iterator;
    }
    has(key) {
        return !!this.map[key];
    }
    get(key) {
        return this.map[key];
    }
    wasSeen(key) {
        let node = this.map[key];
        return node && node.seen;
    }
    append(item) {
        let map = this.map,
            list = this.list,
            iterable = this.iterable;

        let node = map[item.key] = new ListItem(iterable, item);
        list.append(node);
        return node;
    }
    insertBefore(item, reference) {
        let map = this.map,
            list = this.list,
            iterable = this.iterable;

        let node = map[item.key] = new ListItem(iterable, item);
        node.retained = true;
        list.insertBefore(node, reference);
        return node;
    }
    move(item, reference) {
        let list = this.list;

        item.retained = true;
        list.remove(item);
        list.insertBefore(item, reference);
    }
    remove(item) {
        let list = this.list;

        list.remove(item);
        delete this.map[item.key];
    }
    nextNode(item) {
        return this.list.nextNode(item);
    }
    head() {
        return this.list.head();
    }
}
class ReferenceIterator {
    // if anyone needs to construct this object with something other than
    // an iterable, let @wycats know.
    constructor(iterable) {
        this.iterator = null;
        let artifacts = new IterationArtifacts(iterable);
        this.artifacts = artifacts;
    }
    next() {
        let artifacts = this.artifacts;

        let iterator = this.iterator = this.iterator || artifacts.iterate();
        let item = iterator.next();
        if (!item) return null;
        return artifacts.append(item);
    }
}
var Phase;
(function (Phase) {
    Phase[Phase["Append"] = 0] = "Append";
    Phase[Phase["Prune"] = 1] = "Prune";
    Phase[Phase["Done"] = 2] = "Done";
})(Phase || (Phase = {}));
class IteratorSynchronizer {
    constructor({ target, artifacts }) {
        this.target = target;
        this.artifacts = artifacts;
        this.iterator = artifacts.iterate();
        this.current = artifacts.head();
    }
    sync() {
        let phase = Phase.Append;
        while (true) {
            switch (phase) {
                case Phase.Append:
                    phase = this.nextAppend();
                    break;
                case Phase.Prune:
                    phase = this.nextPrune();
                    break;
                case Phase.Done:
                    this.nextDone();
                    return;
            }
        }
    }
    advanceToKey(key) {
        let current = this.current,
            artifacts = this.artifacts;

        let seek = current;
        while (seek && seek.key !== key) {
            seek.seen = true;
            seek = artifacts.nextNode(seek);
        }
        this.current = seek && artifacts.nextNode(seek);
    }
    nextAppend() {
        let iterator = this.iterator,
            current = this.current,
            artifacts = this.artifacts;

        let item = iterator.next();
        if (item === null) {
            return this.startPrune();
        }
        let key = item.key;

        if (current && current.key === key) {
            this.nextRetain(item);
        } else if (artifacts.has(key)) {
            this.nextMove(item);
        } else {
            this.nextInsert(item);
        }
        return Phase.Append;
    }
    nextRetain(item) {
        let artifacts = this.artifacts,
            current = this.current;

        current = expect(current, 'BUG: current is empty');
        current.update(item);
        this.current = artifacts.nextNode(current);
        this.target.retain(item.key, current.value, current.memo);
    }
    nextMove(item) {
        let current = this.current,
            artifacts = this.artifacts,
            target = this.target;
        let key = item.key;

        let found = artifacts.get(item.key);
        found.update(item);
        if (artifacts.wasSeen(item.key)) {
            artifacts.move(found, current);
            target.move(found.key, found.value, found.memo, current ? current.key : null);
        } else {
            this.advanceToKey(key);
        }
    }
    nextInsert(item) {
        let artifacts = this.artifacts,
            target = this.target,
            current = this.current;

        let node = artifacts.insertBefore(item, current);
        target.insert(node.key, node.value, node.memo, current ? current.key : null);
    }
    startPrune() {
        this.current = this.artifacts.head();
        return Phase.Prune;
    }
    nextPrune() {
        let artifacts = this.artifacts,
            target = this.target,
            current = this.current;

        if (current === null) {
            return Phase.Done;
        }
        let node = current;
        this.current = artifacts.nextNode(node);
        if (node.shouldRemove()) {
            artifacts.remove(node);
            target.delete(node.key);
        } else {
            node.reset();
        }
        return Phase.Prune;
    }
    nextDone() {
        this.target.done();
    }
}

class PrimitiveReference extends ConstReference {
    constructor(value) {
        super(value);
    }
    static create(value) {
        if (value === undefined) {
            return UNDEFINED_REFERENCE;
        } else if (value === null) {
            return NULL_REFERENCE;
        } else if (value === true) {
            return TRUE_REFERENCE;
        } else if (value === false) {
            return FALSE_REFERENCE;
        } else if (typeof value === 'number') {
            return new ValueReference(value);
        } else {
            return new StringReference(value);
        }
    }
    get(_key) {
        return UNDEFINED_REFERENCE;
    }
}
class StringReference extends PrimitiveReference {
    constructor() {
        super(...arguments);
        this.lengthReference = null;
    }
    get(key) {
        if (key === 'length') {
            let lengthReference = this.lengthReference;

            if (lengthReference === null) {
                lengthReference = this.lengthReference = new ValueReference(this.inner.length);
            }
            return lengthReference;
        } else {
            return super.get(key);
        }
    }
}
class ValueReference extends PrimitiveReference {
    constructor(value) {
        super(value);
    }
}
const UNDEFINED_REFERENCE = new ValueReference(undefined);
const NULL_REFERENCE = new ValueReference(null);
const TRUE_REFERENCE = new ValueReference(true);
const FALSE_REFERENCE = new ValueReference(false);
class ConditionalReference {
    constructor(inner) {
        this.inner = inner;
        this.tag = inner.tag;
    }
    value() {
        return this.toBool(this.inner.value());
    }
    toBool(value) {
        return !!value;
    }
}

class ConcatReference extends CachedReference {
    constructor(parts) {
        super();
        this.parts = parts;
        this.tag = combineTagged(parts);
    }
    compute() {
        let parts = new Array();
        for (let i = 0; i < this.parts.length; i++) {
            let value = this.parts[i].value();
            if (value !== null && value !== undefined) {
                parts[i] = castToString(value);
            }
        }
        if (parts.length > 0) {
            return parts.join('');
        }
        return null;
    }
}
function castToString(value) {
    if (typeof value.toString !== 'function') {
        return '';
    }
    return String(value);
}

APPEND_OPCODES.add(1 /* Helper */, (vm, { op1: _helper }) => {
    let stack = vm.stack;
    let helper = vm.constants.getFunction(_helper);
    let args = stack.pop();
    let value = helper(vm, args);
    args.clear();
    vm.stack.push(value);
});
APPEND_OPCODES.add(2 /* Function */, (vm, { op1: _function }) => {
    let func = vm.constants.getFunction(_function);
    vm.stack.push(func(vm));
});
APPEND_OPCODES.add(5 /* GetVariable */, (vm, { op1: symbol }) => {
    let expr = vm.referenceForSymbol(symbol);
    vm.stack.push(expr);
});
APPEND_OPCODES.add(4 /* SetVariable */, (vm, { op1: symbol }) => {
    let expr = vm.stack.pop();
    vm.scope().bindSymbol(symbol, expr);
});
APPEND_OPCODES.add(70 /* ResolveMaybeLocal */, (vm, { op1: _name }) => {
    let name = vm.constants.getString(_name);
    let locals = vm.scope().getPartialMap();
    let ref = locals[name];
    if (ref === undefined) {
        ref = vm.getSelf().get(name);
    }
    vm.stack.push(ref);
});
APPEND_OPCODES.add(19 /* RootScope */, (vm, { op1: symbols, op2: bindCallerScope }) => {
    vm.pushRootScope(symbols, !!bindCallerScope);
});
APPEND_OPCODES.add(6 /* GetProperty */, (vm, { op1: _key }) => {
    let key = vm.constants.getString(_key);
    let expr = vm.stack.pop();
    vm.stack.push(expr.get(key));
});
APPEND_OPCODES.add(7 /* PushBlock */, (vm, { op1: _block }) => {
    let block = _block ? vm.constants.getBlock(_block) : null;
    vm.stack.push(block);
});
APPEND_OPCODES.add(8 /* GetBlock */, (vm, { op1: _block }) => {
    vm.stack.push(vm.scope().getBlock(_block));
});
APPEND_OPCODES.add(9 /* HasBlock */, (vm, { op1: _block }) => {
    let hasBlock = !!vm.scope().getBlock(_block);
    vm.stack.push(hasBlock ? TRUE_REFERENCE : FALSE_REFERENCE);
});
APPEND_OPCODES.add(10 /* HasBlockParams */, (vm, { op1: _block }) => {
    let block = vm.scope().getBlock(_block);
    let hasBlockParams = block && block.symbolTable.parameters.length;
    vm.stack.push(hasBlockParams ? TRUE_REFERENCE : FALSE_REFERENCE);
});
APPEND_OPCODES.add(11 /* Concat */, (vm, { op1: count }) => {
    let out = [];
    for (let i = count; i > 0; i--) {
        out.push(vm.stack.pop());
    }
    vm.stack.push(new ConcatReference(out.reverse()));
});

function normalizeStringValue(value) {
    if (isEmpty(value)) {
        return '';
    }
    return String(value);
}
function normalizeTrustedValue(value) {
    if (isEmpty(value)) {
        return '';
    }
    if (isString(value)) {
        return value;
    }
    if (isSafeString(value)) {
        return value.toHTML();
    }
    if (isNode(value)) {
        return value;
    }
    return String(value);
}
function isEmpty(value) {
    return value === null || value === undefined || typeof value.toString !== 'function';
}
function isSafeString(value) {
    return typeof value === 'object' && value !== null && typeof value.toHTML === 'function';
}
function isNode(value) {
    return typeof value === 'object' && value !== null && typeof value.nodeType === 'number';
}
function isFragment(value) {
    return isNode(value) && value.nodeType === 11;
}
function isString(value) {
    return typeof value === 'string';
}

APPEND_OPCODES.add(20 /* ChildScope */, vm => vm.pushChildScope());
APPEND_OPCODES.add(21 /* PopScope */, vm => vm.popScope());
APPEND_OPCODES.add(39 /* PushDynamicScope */, vm => vm.pushDynamicScope());
APPEND_OPCODES.add(40 /* PopDynamicScope */, vm => vm.popDynamicScope());
APPEND_OPCODES.add(12 /* Immediate */, (vm, { op1: number }) => {
    vm.stack.push(number);
});
APPEND_OPCODES.add(13 /* Constant */, (vm, { op1: other }) => {
    vm.stack.push(vm.constants.getOther(other));
});
APPEND_OPCODES.add(14 /* PrimitiveReference */, (vm, { op1: primitive }) => {
    let stack = vm.stack;
    let flag = (primitive & 3 << 30) >>> 30;
    let value = primitive & ~(3 << 30);
    switch (flag) {
        case 0:
            stack.push(PrimitiveReference.create(value));
            break;
        case 1:
            stack.push(PrimitiveReference.create(vm.constants.getString(value)));
            break;
        case 2:
            switch (value) {
                case 0:
                    stack.push(FALSE_REFERENCE);
                    break;
                case 1:
                    stack.push(TRUE_REFERENCE);
                    break;
                case 2:
                    stack.push(NULL_REFERENCE);
                    break;
                case 3:
                    stack.push(UNDEFINED_REFERENCE);
                    break;
            }
            break;
    }
});
APPEND_OPCODES.add(15 /* Dup */, (vm, { op1: register, op2: offset }) => {
    let position = vm.fetchValue(register) - offset;
    vm.stack.dup(position);
});
APPEND_OPCODES.add(16 /* Pop */, (vm, { op1: count }) => vm.stack.pop(count));
APPEND_OPCODES.add(17 /* Load */, (vm, { op1: register }) => vm.load(register));
APPEND_OPCODES.add(18 /* Fetch */, (vm, { op1: register }) => vm.fetch(register));
APPEND_OPCODES.add(38 /* BindDynamicScope */, (vm, { op1: _names }) => {
    let names = vm.constants.getArray(_names);
    vm.bindDynamicScope(names);
});
APPEND_OPCODES.add(47 /* PushFrame */, vm => vm.pushFrame());
APPEND_OPCODES.add(48 /* PopFrame */, vm => vm.popFrame());
APPEND_OPCODES.add(49 /* Enter */, (vm, { op1: args }) => vm.enter(args));
APPEND_OPCODES.add(50 /* Exit */, vm => vm.exit());
APPEND_OPCODES.add(41 /* CompileDynamicBlock */, vm => {
    let stack = vm.stack;
    let block = stack.pop();
    stack.push(block ? block.compileDynamic(vm.env) : null);
});
APPEND_OPCODES.add(42 /* InvokeStatic */, (vm, { op1: _block }) => {
    let block = vm.constants.getBlock(_block);
    let compiled = block.compileStatic(vm.env);
    vm.call(compiled.handle);
});
APPEND_OPCODES.add(43 /* InvokeDynamic */, (vm, { op1: _invoker }) => {
    let invoker = vm.constants.getOther(_invoker);
    let block = vm.stack.pop();
    invoker.invoke(vm, block);
});
APPEND_OPCODES.add(44 /* Jump */, (vm, { op1: target }) => vm.goto(target));
APPEND_OPCODES.add(45 /* JumpIf */, (vm, { op1: target }) => {
    let reference = vm.stack.pop();
    if (isConst(reference)) {
        if (reference.value()) {
            vm.goto(target);
        }
    } else {
        let cache = new ReferenceCache(reference);
        if (cache.peek()) {
            vm.goto(target);
        }
        vm.updateWith(new Assert(cache));
    }
});
APPEND_OPCODES.add(46 /* JumpUnless */, (vm, { op1: target }) => {
    let reference = vm.stack.pop();
    if (isConst(reference)) {
        if (!reference.value()) {
            vm.goto(target);
        }
    } else {
        let cache = new ReferenceCache(reference);
        if (!cache.peek()) {
            vm.goto(target);
        }
        vm.updateWith(new Assert(cache));
    }
});
APPEND_OPCODES.add(22 /* Return */, vm => vm.return());
APPEND_OPCODES.add(23 /* ReturnTo */, (vm, { op1: relative }) => {
    vm.returnTo(relative);
});
const ConstTest = function ConstTest(ref, _env) {
    return new ConstReference(!!ref.value());
};
const SimpleTest = function SimpleTest(ref, _env) {
    return ref;
};
const EnvironmentTest = function EnvironmentTest(ref, env) {
    return env.toConditionalReference(ref);
};
APPEND_OPCODES.add(51 /* Test */, (vm, { op1: _func }) => {
    let stack = vm.stack;
    let operand = stack.pop();
    let func = vm.constants.getFunction(_func);
    stack.push(func(operand, vm.env));
});
class Assert extends UpdatingOpcode {
    constructor(cache) {
        super();
        this.type = 'assert';
        this.tag = cache.tag;
        this.cache = cache;
    }
    evaluate(vm) {
        let cache = this.cache;

        if (isModified(cache.revalidate())) {
            vm.throw();
        }
    }
    toJSON() {
        let type = this.type,
            _guid = this._guid,
            cache = this.cache;

        let expected;
        try {
            expected = JSON.stringify(cache.peek());
        } catch (e) {
            expected = String(cache.peek());
        }
        return {
            args: [],
            details: { expected },
            guid: _guid,
            type
        };
    }
}
class JumpIfNotModifiedOpcode extends UpdatingOpcode {
    constructor(tag, target) {
        super();
        this.target = target;
        this.type = 'jump-if-not-modified';
        this.tag = tag;
        this.lastRevision = tag.value();
    }
    evaluate(vm) {
        let tag = this.tag,
            target = this.target,
            lastRevision = this.lastRevision;

        if (!vm.alwaysRevalidate && tag.validate(lastRevision)) {
            vm.goto(target);
        }
    }
    didModify() {
        this.lastRevision = this.tag.value();
    }
    toJSON() {
        return {
            args: [JSON.stringify(this.target.inspect())],
            guid: this._guid,
            type: this.type
        };
    }
}
class DidModifyOpcode extends UpdatingOpcode {
    constructor(target) {
        super();
        this.target = target;
        this.type = 'did-modify';
        this.tag = CONSTANT_TAG;
    }
    evaluate() {
        this.target.didModify();
    }
}
class LabelOpcode {
    constructor(label) {
        this.tag = CONSTANT_TAG;
        this.type = 'label';
        this.label = null;
        this.prev = null;
        this.next = null;
        initializeGuid(this);
        this.label = label;
    }
    evaluate() {}
    inspect() {
        return `${this.label} [${this._guid}]`;
    }
    toJSON() {
        return {
            args: [JSON.stringify(this.inspect())],
            guid: this._guid,
            type: this.type
        };
    }
}

APPEND_OPCODES.add(24 /* Text */, (vm, { op1: text }) => {
    vm.elements().appendText(vm.constants.getString(text));
});
APPEND_OPCODES.add(25 /* Comment */, (vm, { op1: text }) => {
    vm.elements().appendComment(vm.constants.getString(text));
});
APPEND_OPCODES.add(27 /* OpenElement */, (vm, { op1: tag }) => {
    vm.elements().openElement(vm.constants.getString(tag));
});
APPEND_OPCODES.add(28 /* OpenElementWithOperations */, (vm, { op1: tag }) => {
    let tagName = vm.constants.getString(tag);
    vm.elements().openElement(tagName);
});
APPEND_OPCODES.add(29 /* OpenDynamicElement */, vm => {
    let tagName = vm.stack.pop().value();
    vm.elements().openElement(tagName);
});
APPEND_OPCODES.add(36 /* PushRemoteElement */, vm => {
    let elementRef = vm.stack.pop();
    let nextSiblingRef = vm.stack.pop();
    let element;
    let nextSibling;
    if (isConst(elementRef)) {
        element = elementRef.value();
    } else {
        let cache = new ReferenceCache(elementRef);
        element = cache.peek();
        vm.updateWith(new Assert(cache));
    }
    if (isConst(nextSiblingRef)) {
        nextSibling = nextSiblingRef.value();
    } else {
        let cache = new ReferenceCache(nextSiblingRef);
        nextSibling = cache.peek();
        vm.updateWith(new Assert(cache));
    }
    vm.elements().pushRemoteElement(element, nextSibling);
});
APPEND_OPCODES.add(37 /* PopRemoteElement */, vm => vm.elements().popRemoteElement());
APPEND_OPCODES.add(33 /* FlushElement */, vm => {
    let operations = vm.fetchValue(Register.t0);
    if (operations) {
        operations.flush(vm);
        vm.loadValue(Register.t0, null);
    }
    vm.elements().flushElement();
});
APPEND_OPCODES.add(34 /* CloseElement */, vm => vm.elements().closeElement());
APPEND_OPCODES.add(35 /* Modifier */, (vm, { op1: _manager }) => {
    let manager = vm.constants.getOther(_manager);
    let stack = vm.stack;
    let args = stack.pop();

    var _vm$elements = vm.elements();

    let element = _vm$elements.constructing,
        updateOperations = _vm$elements.updateOperations;

    let dynamicScope = vm.dynamicScope();
    let modifier = manager.create(element, args, dynamicScope, updateOperations);
    args.clear();
    vm.env.scheduleInstallModifier(modifier, manager);
    let destructor = manager.getDestructor(modifier);
    if (destructor) {
        vm.newDestroyable(destructor);
    }
    let tag = manager.getTag(modifier);
    if (!isConstTag(tag)) {
        vm.updateWith(new UpdateModifierOpcode(tag, manager, modifier));
    }
});
class UpdateModifierOpcode extends UpdatingOpcode {
    constructor(tag, manager, modifier) {
        super();
        this.tag = tag;
        this.manager = manager;
        this.modifier = modifier;
        this.type = 'update-modifier';
        this.lastUpdated = tag.value();
    }
    evaluate(vm) {
        let manager = this.manager,
            modifier = this.modifier,
            tag = this.tag,
            lastUpdated = this.lastUpdated;

        if (!tag.validate(lastUpdated)) {
            vm.env.scheduleUpdateModifier(modifier, manager);
            this.lastUpdated = tag.value();
        }
    }
    toJSON() {
        return {
            guid: this._guid,
            type: this.type
        };
    }
}
// APPEND_OPCODES.add(Op.ComponentAttr, )
APPEND_OPCODES.add(30 /* StaticAttr */, (vm, { op1: _name, op2: _value, op3: _namespace }) => {
    let name = vm.constants.getString(_name);
    let value = vm.constants.getString(_value);
    let namespace = _namespace ? vm.constants.getString(_namespace) : null;
    vm.elements().setStaticAttribute(name, value, namespace);
});
APPEND_OPCODES.add(31 /* DynamicAttr */, (vm, { op1: _name, op2: trusting, op3: _namespace }) => {
    let name = vm.constants.getString(_name);
    let reference = vm.stack.pop();
    let value = reference.value();
    let namespace = _namespace ? vm.constants.getString(_namespace) : null;
    let attribute = vm.elements().setDynamicAttribute(name, value, !!trusting, namespace);
    if (!isConst(reference)) {
        vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute));
    }
});
class UpdateDynamicAttributeOpcode extends UpdatingOpcode {
    constructor(reference, attribute) {
        super();
        this.reference = reference;
        this.attribute = attribute;
        this.type = 'patch-element';
        this.tag = reference.tag;
    }
    evaluate(vm) {
        let attribute = this.attribute,
            reference = this.reference;

        attribute.update(reference.value(), vm.env);
    }
}

class Arguments {
    constructor() {
        this.stack = null;
        this.positional = new PositionalArguments();
        this.named = new NamedArguments();
    }
    empty() {
        this.setup(null, true);
        return this;
    }
    setup(stack, synthetic) {
        this.stack = stack;
        let names = stack.fromTop(0);
        let namedCount = names.length;
        let positionalCount = stack.fromTop(namedCount + 1);
        let start = positionalCount + namedCount + 2;
        let positional = this.positional;
        positional.setup(stack, start, positionalCount);
        let named = this.named;
        named.setup(stack, namedCount, names, synthetic);
    }
    get tag() {
        return combineTagged([this.positional, this.named]);
    }
    get length() {
        return this.positional.length + this.named.length;
    }
    at(pos) {
        return this.positional.at(pos);
    }
    get(name) {
        return this.named.get(name);
    }
    capture() {
        return {
            tag: this.tag,
            length: this.length,
            positional: this.positional.capture(),
            named: this.named.capture()
        };
    }
    clear() {
        let stack = this.stack,
            length = this.length;

        stack.pop(length + 2);
    }
}
class PositionalArguments {
    constructor() {
        this.length = 0;
        this.stack = null;
        this.start = 0;
        this._tag = null;
        this._references = null;
    }
    setup(stack, start, length) {
        this.stack = stack;
        this.start = start;
        this.length = length;
        this._tag = null;
        this._references = null;
    }
    get tag() {
        let tag = this._tag;
        if (!tag) {
            tag = this._tag = combineTagged(this.references);
        }
        return tag;
    }
    at(position) {
        let start = this.start,
            length = this.length;

        if (position < 0 || position >= length) {
            return UNDEFINED_REFERENCE;
        }
        // stack: pos1, pos2, pos3, named1, named2
        // start: 4 (top - 4)
        //
        // at(0) === pos1 === top - start
        // at(1) === pos2 === top - (start - 1)
        // at(2) === pos3 === top - (start - 2)
        let fromTop = start - position - 1;
        return this.stack.fromTop(fromTop);
    }
    capture() {
        return new CapturedPositionalArguments(this.tag, this.references);
    }
    get references() {
        let references = this._references;
        if (!references) {
            let length = this.length;

            references = this._references = new Array(length);
            for (let i = 0; i < length; i++) {
                references[i] = this.at(i);
            }
        }
        return references;
    }
}
class CapturedPositionalArguments {
    constructor(tag, references, length = references.length) {
        this.tag = tag;
        this.references = references;
        this.length = length;
    }
    at(position) {
        return this.references[position];
    }
    value() {
        return this.references.map(this.valueOf);
    }
    get(name) {
        let references = this.references,
            length = this.length;

        if (name === 'length') {
            return PrimitiveReference.create(length);
        } else {
            let idx = parseInt(name, 10);
            if (idx < 0 || idx >= length) {
                return UNDEFINED_REFERENCE;
            } else {
                return references[idx];
            }
        }
    }
    valueOf(reference) {
        return reference.value();
    }
}
class NamedArguments {
    constructor() {
        this.length = 0;
        this._tag = null;
        this._references = null;
        this._names = null;
        this._realNames = EMPTY_ARRAY;
    }
    setup(stack, length, names, synthetic) {
        this.stack = stack;
        this.length = length;
        this._tag = null;
        this._references = null;
        if (synthetic) {
            this._names = names;
            this._realNames = EMPTY_ARRAY;
        } else {
            this._names = null;
            this._realNames = names;
        }
    }
    get tag() {
        return combineTagged(this.references);
    }
    get names() {
        let names = this._names;
        if (!names) {
            names = this._names = this._realNames.map(this.sliceName);
        }
        return names;
    }
    has(name) {
        return this.names.indexOf(name) !== -1;
    }
    get(name) {
        let names = this.names,
            length = this.length;

        let idx = names.indexOf(name);
        if (idx === -1) {
            return UNDEFINED_REFERENCE;
        }
        // stack: pos1, pos2, pos3, named1, named2
        // start: 4 (top - 4)
        // namedDict: { named1: 1, named2: 0 };
        //
        // get('named1') === named1 === top - (start - 1)
        // get('named2') === named2 === top - start
        let fromTop = length - idx;
        return this.stack.fromTop(fromTop);
    }
    capture() {
        return new CapturedNamedArguments(this.tag, this.names, this.references);
    }
    get references() {
        let references = this._references;
        if (!references) {
            let names = this.names,
                length = this.length;

            references = this._references = [];
            for (let i = 0; i < length; i++) {
                references[i] = this.get(names[i]);
            }
        }
        return references;
    }
    sliceName(name) {
        return name.slice(1);
    }
}
class CapturedNamedArguments {
    constructor(tag, names, references) {
        this.tag = tag;
        this.names = names;
        this.references = references;
        this.length = names.length;
        this._map = null;
    }
    get map() {
        let map$$1 = this._map;
        if (!map$$1) {
            let names = this.names,
                references = this.references;

            map$$1 = this._map = dict();
            for (let i = 0; i < names.length; i++) {
                let name = names[i];
                map$$1[name] = references[i];
            }
        }
        return map$$1;
    }
    has(name) {
        return this.names.indexOf(name) !== -1;
    }
    get(name) {
        let names = this.names,
            references = this.references;

        let idx = names.indexOf(name);
        if (idx === -1) {
            return UNDEFINED_REFERENCE;
        } else {
            return references[idx];
        }
    }
    value() {
        let names = this.names,
            references = this.references;

        let out = dict();
        for (let i = 0; i < names.length; i++) {
            let name = names[i];
            out[name] = references[i].value();
        }
        return out;
    }
}
var ARGS = new Arguments();

APPEND_OPCODES.add(56 /* PushComponentManager */, (vm, { op1: _definition }) => {
    let definition = vm.constants.getOther(_definition);
    let stack = vm.stack;
    stack.push({ definition, manager: definition.manager, component: null });
});
APPEND_OPCODES.add(57 /* PushDynamicComponentManager */, vm => {
    let stack = vm.stack;
    let reference = stack.pop();
    let cache = isConst(reference) ? undefined : new ReferenceCache(reference);
    let definition = cache ? cache.peek() : reference.value();
    stack.push({ definition, manager: definition.manager, component: null });
    if (cache) {
        vm.updateWith(new Assert(cache));
    }
});
APPEND_OPCODES.add(58 /* PushArgs */, (vm, { op1: synthetic }) => {
    let stack = vm.stack;
    ARGS.setup(stack, !!synthetic);
    stack.push(ARGS);
});
APPEND_OPCODES.add(59 /* PrepareArgs */, (vm, { op1: _state }) => {
    let stack = vm.stack;

    var _vm$fetchValue = vm.fetchValue(_state);

    let definition = _vm$fetchValue.definition,
        manager = _vm$fetchValue.manager;

    let args = stack.pop();
    let preparedArgs = manager.prepareArgs(definition, args);
    if (preparedArgs) {
        args.clear();
        let positional = preparedArgs.positional,
            named = preparedArgs.named;

        let positionalCount = positional.length;
        for (let i = 0; i < positionalCount; i++) {
            stack.push(positional[i]);
        }
        stack.push(positionalCount);
        let names = Object.keys(named);
        let namedCount = names.length;
        let atNames = [];
        for (let i = 0; i < namedCount; i++) {
            let value = named[names[i]];
            let atName = `@${names[i]}`;
            stack.push(value);
            atNames.push(atName);
        }
        stack.push(atNames);
        args.setup(stack, false);
    }
    stack.push(args);
});
APPEND_OPCODES.add(60 /* CreateComponent */, (vm, { op1: flags, op2: _state }) => {
    var _vm$fetchValue2;

    let definition;
    let manager;
    let args = vm.stack.pop();
    let dynamicScope = vm.dynamicScope();
    let state = (_vm$fetchValue2 = vm.fetchValue(_state), definition = _vm$fetchValue2.definition, manager = _vm$fetchValue2.manager, _vm$fetchValue2);
    let hasDefaultBlock = flags & 1;
    let component = manager.create(vm.env, definition, args, dynamicScope, vm.getSelf(), !!hasDefaultBlock);
    state.component = component;
    let tag = manager.getTag(component);
    if (!isConstTag(tag)) {
        vm.updateWith(new UpdateComponentOpcode(tag, definition.name, component, manager, dynamicScope));
    }
});
APPEND_OPCODES.add(61 /* RegisterComponentDestructor */, (vm, { op1: _state }) => {
    var _vm$fetchValue3 = vm.fetchValue(_state);

    let manager = _vm$fetchValue3.manager,
        component = _vm$fetchValue3.component;

    let destructor = manager.getDestructor(component);
    if (destructor) vm.newDestroyable(destructor);
});
APPEND_OPCODES.add(65 /* BeginComponentTransaction */, vm => {
    vm.beginCacheGroup();
    vm.elements().pushSimpleBlock();
});
APPEND_OPCODES.add(62 /* PutComponentOperations */, vm => {
    vm.loadValue(Register.t0, new ComponentElementOperations());
});
APPEND_OPCODES.add(32 /* ComponentAttr */, (vm, { op1: _name, op2: trusting, op3: _namespace }) => {
    let name = vm.constants.getString(_name);
    let reference = vm.stack.pop();
    let namespace = _namespace ? vm.constants.getString(_namespace) : null;
    vm.fetchValue(Register.t0).setAttribute(name, reference, !!trusting, namespace);
});
class ComponentElementOperations {
    constructor() {
        this.attributes = dict();
        this.classes = [];
    }
    setAttribute(name, value, trusting, namespace) {
        let deferred = { value, namespace, trusting };
        if (name === 'class') {
            this.classes.push(value);
        }
        this.attributes[name] = deferred;
    }
    flush(vm) {
        for (let name in this.attributes) {
            let attr = this.attributes[name];
            let reference = attr.value,
                namespace = attr.namespace,
                trusting = attr.trusting;

            if (name === 'class') {
                reference = new ClassListReference(this.classes);
            }
            let attribute = vm.elements().setDynamicAttribute(name, reference.value(), trusting, namespace);
            if (!isConst(reference)) {
                vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute));
            }
        }
    }
}
class ClassListReference {
    constructor(list) {
        this.list = list;
        this.tag = combineTagged(list);
        this.list = list;
    }
    value() {
        let ret = [];
        let list = this.list;

        for (let i = 0; i < list.length; i++) {
            let value = normalizeStringValue(list[i].value());
            if (value) ret.push(value);
        }
        return ret.length === 0 ? null : ret.join(' ');
    }
}
APPEND_OPCODES.add(67 /* DidCreateElement */, (vm, { op1: _state }) => {
    var _vm$fetchValue4 = vm.fetchValue(_state);

    let manager = _vm$fetchValue4.manager,
        component = _vm$fetchValue4.component;

    let operations = vm.fetchValue(Register.t0);
    let action = 'DidCreateElementOpcode#evaluate';
    manager.didCreateElement(component, vm.elements().expectConstructing(action), operations);
});
APPEND_OPCODES.add(63 /* GetComponentSelf */, (vm, { op1: _state }) => {
    let state = vm.fetchValue(_state);
    vm.stack.push(state.manager.getSelf(state.component));
});
APPEND_OPCODES.add(64 /* GetComponentLayout */, (vm, { op1: _state }) => {
    var _vm$fetchValue5 = vm.fetchValue(_state);

    let manager = _vm$fetchValue5.manager,
        definition = _vm$fetchValue5.definition,
        component = _vm$fetchValue5.component;

    vm.stack.push(manager.layoutFor(definition, component, vm.env));
});
APPEND_OPCODES.add(68 /* DidRenderLayout */, (vm, { op1: _state }) => {
    var _vm$fetchValue6 = vm.fetchValue(_state);

    let manager = _vm$fetchValue6.manager,
        component = _vm$fetchValue6.component;

    let bounds = vm.elements().popBlock();
    manager.didRenderLayout(component, bounds);
    vm.env.didCreate(component, manager);
    vm.updateWith(new DidUpdateLayoutOpcode(manager, component, bounds));
});
APPEND_OPCODES.add(66 /* CommitComponentTransaction */, vm => vm.commitCacheGroup());
class UpdateComponentOpcode extends UpdatingOpcode {
    constructor(tag, name, component, manager, dynamicScope) {
        super();
        this.tag = tag;
        this.name = name;
        this.component = component;
        this.manager = manager;
        this.dynamicScope = dynamicScope;
        this.type = 'update-component';
    }
    evaluate(_vm) {
        let component = this.component,
            manager = this.manager,
            dynamicScope = this.dynamicScope;

        manager.update(component, dynamicScope);
    }
    toJSON() {
        return {
            args: [JSON.stringify(this.name)],
            guid: this._guid,
            type: this.type
        };
    }
}
class DidUpdateLayoutOpcode extends UpdatingOpcode {
    constructor(manager, component, bounds) {
        super();
        this.manager = manager;
        this.component = component;
        this.bounds = bounds;
        this.type = 'did-update-layout';
        this.tag = CONSTANT_TAG;
    }
    evaluate(vm) {
        let manager = this.manager,
            component = this.component,
            bounds = this.bounds;

        manager.didUpdateLayout(component, bounds);
        vm.env.didUpdate(component, manager);
    }
}

const COMPONENT_DEFINITION_BRAND = 'COMPONENT DEFINITION [id=e59c754e-61eb-4392-8c4a-2c0ac72bfcd4]';
function isComponentDefinition(obj) {
    return typeof obj === 'object' && obj !== null && obj[COMPONENT_DEFINITION_BRAND];
}
class ComponentDefinition {
    constructor(name, manager, ComponentClass) {
        this[COMPONENT_DEFINITION_BRAND] = true;
        this.name = name;
        this.manager = manager;
        this.ComponentClass = ComponentClass;
    }
}

class IsComponentDefinitionReference extends ConditionalReference {
    static create(inner) {
        return new IsComponentDefinitionReference(inner);
    }
    toBool(value) {
        return isComponentDefinition(value);
    }
}
APPEND_OPCODES.add(26 /* DynamicContent */, (vm, { op1: isTrusting }) => {
    let reference = vm.stack.pop();
    let value = reference.value();
    let content;
    if (isTrusting) {
        content = vm.elements().appendTrustingDynamicContent(value);
    } else {
        content = vm.elements().appendCautiousDynamicContent(value);
    }
    if (!isConst(reference)) {
        vm.updateWith(new UpdateDynamicContentOpcode(reference, content));
    }
});
class UpdateDynamicContentOpcode extends UpdatingOpcode {
    constructor(reference, content) {
        super();
        this.reference = reference;
        this.content = content;
        this.tag = reference.tag;
    }
    evaluate(vm) {
        let content = this.content,
            reference = this.reference;

        content.update(vm.env, reference.value());
    }
}

function debugCallback(context, get) {
    console.info('Use `context`, and `get(<path>)` to debug this template.');
    // for example...
    context === get('this');
    debugger;
}
/* tslint:enable */
let callback = debugCallback;
// For testing purposes


class ScopeInspector {
    constructor(scope, symbols, evalInfo) {
        this.scope = scope;
        this.locals = dict();
        for (let i = 0; i < evalInfo.length; i++) {
            let slot = evalInfo[i];
            let name = symbols[slot - 1];
            let ref = scope.getSymbol(slot);
            this.locals[name] = ref;
        }
    }
    get(path) {
        let scope = this.scope,
            locals = this.locals;

        let parts = path.split('.');

        var _path$split = path.split('.');

        let head = _path$split[0],
            tail = _path$split.slice(1);

        let evalScope = scope.getEvalScope();
        let ref;
        if (head === 'this') {
            ref = scope.getSelf();
        } else if (locals[head]) {
            ref = locals[head];
        } else if (head.indexOf('@') === 0 && evalScope[head]) {
            ref = evalScope[head];
        } else {
            ref = this.scope.getSelf();
            tail = parts;
        }
        return tail.reduce((r, part) => r.get(part), ref);
    }
}
APPEND_OPCODES.add(71 /* Debugger */, (vm, { op1: _symbols, op2: _evalInfo }) => {
    let symbols = vm.constants.getOther(_symbols);
    let evalInfo = vm.constants.getArray(_evalInfo);
    let inspector = new ScopeInspector(vm.scope(), symbols, evalInfo);
    callback(vm.getSelf().value(), path => inspector.get(path).value());
});

APPEND_OPCODES.add(69 /* GetPartialTemplate */, vm => {
    let stack = vm.stack;
    let definition = stack.pop();
    stack.push(definition.value().template.asPartial());
});

class IterablePresenceReference {
    constructor(artifacts) {
        this.tag = artifacts.tag;
        this.artifacts = artifacts;
    }
    value() {
        return !this.artifacts.isEmpty();
    }
}
APPEND_OPCODES.add(54 /* PutIterator */, vm => {
    let stack = vm.stack;
    let listRef = stack.pop();
    let key = stack.pop();
    let iterable = vm.env.iterableFor(listRef, key.value());
    let iterator = new ReferenceIterator(iterable);
    stack.push(iterator);
    stack.push(new IterablePresenceReference(iterator.artifacts));
});
APPEND_OPCODES.add(52 /* EnterList */, (vm, { op1: relativeStart }) => {
    vm.enterList(relativeStart);
});
APPEND_OPCODES.add(53 /* ExitList */, vm => vm.exitList());
APPEND_OPCODES.add(55 /* Iterate */, (vm, { op1: breaks }) => {
    let stack = vm.stack;
    let item = stack.peek().next();
    if (item) {
        let tryOpcode = vm.iterate(item.memo, item.value);
        vm.enterItem(item.key, tryOpcode);
    } else {
        vm.goto(breaks);
    }
});

class Cursor {
    constructor(element, nextSibling) {
        this.element = element;
        this.nextSibling = nextSibling;
    }
}
function currentNode(cursor) {
    let element = cursor.element,
        nextSibling = cursor.nextSibling;

    if (nextSibling === null) {
        return element.lastChild;
    } else {
        return nextSibling.previousSibling;
    }
}

class ConcreteBounds {
    constructor(parentNode, first, last) {
        this.parentNode = parentNode;
        this.first = first;
        this.last = last;
    }
    parentElement() {
        return this.parentNode;
    }
    firstNode() {
        return this.first;
    }
    lastNode() {
        return this.last;
    }
}
class SingleNodeBounds {
    constructor(parentNode, node) {
        this.parentNode = parentNode;
        this.node = node;
    }
    parentElement() {
        return this.parentNode;
    }
    firstNode() {
        return this.node;
    }
    lastNode() {
        return this.node;
    }
}
function bounds(parent, first, last) {
    return new ConcreteBounds(parent, first, last);
}
function single(parent, node) {
    return new SingleNodeBounds(parent, node);
}
function move(bounds, reference) {
    let parent = bounds.parentElement();
    let first = bounds.firstNode();
    let last = bounds.lastNode();
    let node = first;
    while (node) {
        let next = node.nextSibling;
        parent.insertBefore(node, reference);
        if (node === last) return next;
        node = next;
    }
    return null;
}
function clear(bounds) {
    let parent = bounds.parentElement();
    let first = bounds.firstNode();
    let last = bounds.lastNode();
    let node = first;
    while (node) {
        let next = node.nextSibling;
        parent.removeChild(node);
        if (node === last) return next;
        node = next;
    }
    return null;
}

class DynamicContentBase {
    constructor(trusting) {
        this.trusting = trusting;
    }
    retry(env, value) {
        let bounds$$1 = this.bounds;

        let parentElement = bounds$$1.parentElement();
        let nextSibling = clear(bounds$$1);
        let stack = NewElementBuilder.forInitialRender(env, parentElement, nextSibling);
        if (this.trusting) {
            return stack.__appendTrustingDynamicContent(value);
        } else {
            return stack.__appendCautiousDynamicContent(value);
        }
    }
}
class DynamicContentWrapper {
    constructor(inner) {
        this.inner = inner;
        this.bounds = inner.bounds;
    }
    parentElement() {
        return this.bounds.parentElement();
    }
    firstNode() {
        return this.bounds.firstNode();
    }
    lastNode() {
        return this.bounds.lastNode();
    }
    update(env, value) {
        let inner = this.inner = this.inner.update(env, value);
        this.bounds = inner.bounds;
        return this;
    }
}

class DynamicTextContent extends DynamicContentBase {
    constructor(bounds, lastValue, trusted) {
        super(trusted);
        this.bounds = bounds;
        this.lastValue = lastValue;
    }
    update(env, value) {
        let lastValue = this.lastValue;

        if (value === lastValue) return this;
        if (isNode(value) || isSafeString(value)) return this.retry(env, value);
        let normalized;
        if (isEmpty(value)) {
            normalized = '';
        } else if (isString(value)) {
            normalized = value;
        } else {
            normalized = String(value);
        }
        if (normalized !== lastValue) {
            let textNode = this.bounds.firstNode();
            textNode.nodeValue = this.lastValue = normalized;
        }
        return this;
    }
}

class DynamicNodeContent extends DynamicContentBase {
    constructor(bounds, lastValue, trusting) {
        super(trusting);
        this.bounds = bounds;
        this.lastValue = lastValue;
    }
    update(env, value) {
        let lastValue = this.lastValue;

        if (value === lastValue) return this;
        return this.retry(env, value);
    }
}

class DynamicHTMLContent extends DynamicContentBase {
    constructor(bounds, lastValue, trusted) {
        super(trusted);
        this.bounds = bounds;
        this.lastValue = lastValue;
    }
    update(env, value) {
        let lastValue = this.lastValue;

        if (value === lastValue) return this;
        if (isSafeString(value) && value.toHTML() === lastValue.toHTML()) {
            this.lastValue = value;
            return this;
        }
        return this.retry(env, value);
    }
}
class DynamicTrustedHTMLContent extends DynamicContentBase {
    constructor(bounds, lastValue, trusted) {
        super(trusted);
        this.bounds = bounds;
        this.lastValue = lastValue;
    }
    update(env, value) {
        let lastValue = this.lastValue;

        if (value === lastValue) return this;
        let newValue = normalizeTrustedValue(value);
        if (newValue === lastValue) return this;
        return this.retry(env, value);
    }
}

class First {
    constructor(node) {
        this.node = node;
    }
    firstNode() {
        return this.node;
    }
}
class Last {
    constructor(node) {
        this.node = node;
    }
    lastNode() {
        return this.node;
    }
}

class NewElementBuilder {
    constructor(env, parentNode, nextSibling) {
        this.constructing = null;
        this.operations = null;
        this.cursorStack = new Stack();
        this.blockStack = new Stack();
        this.cursorStack.push(new Cursor(parentNode, nextSibling));
        this.env = env;
        this.dom = env.getAppendOperations();
        this.updateOperations = env.getDOM();
    }
    static forInitialRender(env, parentNode, nextSibling) {
        let builder = new this(env, parentNode, nextSibling);
        builder.pushSimpleBlock();
        return builder;
    }
    static resume(env, tracker, nextSibling) {
        let parentNode = tracker.parentElement();
        let stack = new this(env, parentNode, nextSibling);
        stack.pushSimpleBlock();
        stack.pushBlockTracker(tracker);
        return stack;
    }
    get element() {
        return this.cursorStack.current.element;
    }
    get nextSibling() {
        return this.cursorStack.current.nextSibling;
    }
    expectConstructing(method) {
        return expect(this.constructing, `${method} should only be called while constructing an element`);
    }
    expectOperations(method) {
        return expect(this.operations, `${method} should only be called while constructing an element`);
    }
    block() {
        return expect(this.blockStack.current, "Expected a current block tracker");
    }
    popElement() {
        this.cursorStack.pop();
        expect(this.cursorStack.current, "can't pop past the last element");
    }
    pushSimpleBlock() {
        return this.pushBlockTracker(new SimpleBlockTracker(this.element));
    }
    pushUpdatableBlock() {
        return this.pushBlockTracker(new UpdatableBlockTracker(this.element));
    }
    pushBlockList(list) {
        return this.pushBlockTracker(new BlockListTracker(this.element, list));
    }
    pushBlockTracker(tracker, isRemote = false) {
        let current = this.blockStack.current;
        if (current !== null) {
            current.newDestroyable(tracker);
            if (!isRemote) {
                current.didAppendBounds(tracker);
            }
        }
        this.__openBlock();
        this.blockStack.push(tracker);
        return tracker;
    }
    popBlock() {
        this.block().finalize(this);
        this.__closeBlock();
        return expect(this.blockStack.pop(), "Expected popBlock to return a block");
    }
    __openBlock() {}
    __closeBlock() {}
    openElement(tag) {
        let element = this.__openElement(tag);
        this.constructing = element;
        return element;
    }
    __openElement(tag) {
        return this.dom.createElement(tag, this.element);
    }
    flushElement() {
        let parent = this.element;
        let element = expect(this.constructing, `flushElement should only be called when constructing an element`);
        this.__flushElement(parent, element);
        this.constructing = null;
        this.operations = null;
        this.pushElement(element, null);
        this.didOpenElement(element);
    }
    __flushElement(parent, constructing) {
        this.dom.insertBefore(parent, constructing, this.nextSibling);
    }
    closeElement() {
        this.willCloseElement();
        this.popElement();
    }
    pushRemoteElement(element, nextSibling = null) {
        this.pushElement(element, nextSibling);
        let tracker = new RemoteBlockTracker(element);
        this.pushBlockTracker(tracker, true);
    }
    popRemoteElement() {
        this.popBlock();
        this.popElement();
    }
    pushElement(element, nextSibling) {
        this.cursorStack.push(new Cursor(element, nextSibling));
    }
    didAddDestroyable(d) {
        this.block().newDestroyable(d);
    }
    didAppendBounds(bounds$$1) {
        this.block().didAppendBounds(bounds$$1);
        return bounds$$1;
    }
    didAppendNode(node) {
        this.block().didAppendNode(node);
        return node;
    }
    didOpenElement(element) {
        this.block().openElement(element);
        return element;
    }
    willCloseElement() {
        this.block().closeElement();
    }
    appendText(string) {
        return this.didAppendNode(this.__appendText(string));
    }
    __appendText(text) {
        let dom = this.dom,
            element = this.element,
            nextSibling = this.nextSibling;

        let node = dom.createTextNode(text);
        dom.insertBefore(element, node, nextSibling);
        return node;
    }
    appendNode(node) {
        return this.didAppendNode(this.__appendNode(node));
    }
    __appendNode(node) {
        this.dom.insertBefore(this.element, node, this.nextSibling);
        return node;
    }
    appendFragment(fragment) {
        return this.didAppendBounds(this.__appendFragment(fragment));
    }
    __appendFragment(fragment) {
        let first = fragment.firstChild;
        if (first) {
            let ret = bounds(this.element, first, fragment.lastChild);
            this.dom.insertBefore(this.element, fragment, this.nextSibling);
            return ret;
        } else {
            return single(this.element, this.__appendComment(''));
        }
    }
    appendHTML(html) {
        return this.didAppendBounds(this.__appendHTML(html));
    }
    __appendHTML(html) {
        return this.dom.insertHTMLBefore(this.element, this.nextSibling, html);
    }
    appendTrustingDynamicContent(value) {
        let wrapper = new DynamicContentWrapper(this.__appendTrustingDynamicContent(value));
        this.didAppendBounds(wrapper);
        return wrapper;
    }
    __appendTrustingDynamicContent(value) {
        if (isFragment(value)) {
            let bounds$$1 = this.__appendFragment(value);
            return new DynamicNodeContent(bounds$$1, value, true);
        } else if (isNode(value)) {
            let node = this.__appendNode(value);
            return new DynamicNodeContent(single(this.element, node), node, true);
        } else {
            let normalized;
            if (isEmpty(value)) {
                normalized = '';
            } else if (isSafeString(value)) {
                normalized = value.toHTML();
            } else if (isString(value)) {
                normalized = value;
            } else {
                normalized = String(value);
            }
            let bounds$$1 = this.__appendHTML(normalized);
            return new DynamicTrustedHTMLContent(bounds$$1, normalized, true);
        }
    }
    appendCautiousDynamicContent(value) {
        let wrapper = new DynamicContentWrapper(this.__appendCautiousDynamicContent(value));
        this.didAppendBounds(wrapper.bounds);
        return wrapper;
    }
    __appendCautiousDynamicContent(value) {
        if (isFragment(value)) {
            let bounds$$1 = this.__appendFragment(value);
            return new DynamicNodeContent(bounds$$1, value, false);
        } else if (isNode(value)) {
            let node = this.__appendNode(value);
            return new DynamicNodeContent(single(this.element, node), node, false);
        } else if (isSafeString(value)) {
            let normalized = value.toHTML();
            let bounds$$1 = this.__appendHTML(normalized);
            // let bounds = this.dom.insertHTMLBefore(this.element, this.nextSibling, normalized);
            return new DynamicHTMLContent(bounds$$1, value, false);
        } else {
            let normalized;
            if (isEmpty(value)) {
                normalized = '';
            } else if (isString(value)) {
                normalized = value;
            } else {
                normalized = String(value);
            }
            let textNode = this.__appendText(normalized);
            let bounds$$1 = single(this.element, textNode);
            return new DynamicTextContent(bounds$$1, normalized, false);
        }
    }
    appendComment(string) {
        return this.didAppendNode(this.__appendComment(string));
    }
    __appendComment(string) {
        let dom = this.dom,
            element = this.element,
            nextSibling = this.nextSibling;

        let node = dom.createComment(string);
        dom.insertBefore(element, node, nextSibling);
        return node;
    }
    __setAttribute(name, value, namespace) {
        this.dom.setAttribute(this.constructing, name, value, namespace);
    }
    __setProperty(name, value) {
        this.constructing[name] = value;
    }
    setStaticAttribute(name, value, namespace) {
        this.__setAttribute(name, value, namespace);
    }
    setDynamicAttribute(name, value, trusting, namespace) {
        let element = this.constructing;
        let DynamicAttribute = this.env.attributeFor(element, name, trusting, namespace);
        let attribute = new DynamicAttribute({ element, name, namespace: namespace || null });
        attribute.set(this, value, this.env);
        return attribute;
    }
}
class SimpleBlockTracker {
    constructor(parent) {
        this.parent = parent;
        this.first = null;
        this.last = null;
        this.destroyables = null;
        this.nesting = 0;
    }
    destroy() {
        let destroyables = this.destroyables;

        if (destroyables && destroyables.length) {
            for (let i = 0; i < destroyables.length; i++) {
                destroyables[i].destroy();
            }
        }
    }
    parentElement() {
        return this.parent;
    }
    firstNode() {
        return this.first && this.first.firstNode();
    }
    lastNode() {
        return this.last && this.last.lastNode();
    }
    openElement(element) {
        this.didAppendNode(element);
        this.nesting++;
    }
    closeElement() {
        this.nesting--;
    }
    didAppendNode(node) {
        if (this.nesting !== 0) return;
        if (!this.first) {
            this.first = new First(node);
        }
        this.last = new Last(node);
    }
    didAppendBounds(bounds$$1) {
        if (this.nesting !== 0) return;
        if (!this.first) {
            this.first = bounds$$1;
        }
        this.last = bounds$$1;
    }
    newDestroyable(d) {
        this.destroyables = this.destroyables || [];
        this.destroyables.push(d);
    }
    finalize(stack) {
        if (!this.first) {
            stack.appendComment('');
        }
    }
}
class RemoteBlockTracker extends SimpleBlockTracker {
    destroy() {
        super.destroy();
        clear(this);
    }
}
class UpdatableBlockTracker extends SimpleBlockTracker {
    reset(env) {
        let destroyables = this.destroyables;

        if (destroyables && destroyables.length) {
            for (let i = 0; i < destroyables.length; i++) {
                env.didDestroy(destroyables[i]);
            }
        }
        let nextSibling = clear(this);
        this.first = null;
        this.last = null;
        this.destroyables = null;
        this.nesting = 0;
        return nextSibling;
    }
}
class BlockListTracker {
    constructor(parent, boundList) {
        this.parent = parent;
        this.boundList = boundList;
        this.parent = parent;
        this.boundList = boundList;
    }
    destroy() {
        this.boundList.forEachNode(node => node.destroy());
    }
    parentElement() {
        return this.parent;
    }
    firstNode() {
        let head = this.boundList.head();
        return head && head.firstNode();
    }
    lastNode() {
        let tail = this.boundList.tail();
        return tail && tail.lastNode();
    }
    openElement(_element) {
        debugAssert(false, 'Cannot openElement directly inside a block list');
    }
    closeElement() {
        debugAssert(false, 'Cannot closeElement directly inside a block list');
    }
    didAppendNode(_node) {
        debugAssert(false, 'Cannot create a new node directly inside a block list');
    }
    didAppendBounds(_bounds) {}
    newDestroyable(_d) {}
    finalize(_stack) {}
}

class RehydrateBuilder extends NewElementBuilder {
    constructor(env, parentNode, nextSibling) {
        super(env, parentNode, nextSibling);
        // The last node that matched
        this.lastMatchedNode = null;
        this.unmatchedAttributes = null;
        this.blockDepth = 0;
        if (nextSibling) throw new Error("Rehydration with nextSibling not supported");
        this._candidate = parentNode.firstChild;
    }
    get candidate() {
        let candidate = this._candidate;
        if (!candidate) return null;
        if (isComment(candidate) && getCloseBoundsDepth(candidate) === this.blockDepth) {
            return null;
        } else {
            return candidate;
        }
    }
    clearMismatch(candidate) {
        if (isComment(candidate)) {
            let depth = getOpenBoundsDepth(candidate);
            if (depth !== null) {
                this.clearBlock(depth);
                return;
            }
        }
        let current = candidate;
        let until = this.nextSibling;
        while (current && current !== until) {
            current = remove(current);
        }
        this._candidate = null;
    }
    clearBlock(depth) {
        let current = this._candidate;
        while (current && !(isComment(current) && getCloseBoundsDepth(current) === depth)) {
            current = remove(current);
        }
        debugAssert(current && isComment(current) && getCloseBoundsDepth(current) === depth, 'An opening block should be paired with a closing block comment');
        this._candidate = remove(current);
    }
    __openBlock() {
        let candidate = this.candidate;

        if (candidate) {
            if (isComment(candidate)) {
                let depth = getOpenBoundsDepth(candidate);
                if (depth !== null) this.blockDepth = depth;
                this._candidate = remove(candidate);
                return;
            } else {
                this.clearMismatch(candidate);
            }
        }
    }
    __closeBlock() {
        let candidate = this._candidate;

        if (candidate) {
            if (isComment(candidate)) {
                let depth = getCloseBoundsDepth(candidate);
                if (depth !== null) this.blockDepth = depth - 1;
                this._candidate = remove(candidate);
                return;
            } else {
                this.clearMismatch(candidate);
            }
        }
    }
    __appendNode(node) {
        let candidate = this.candidate;
        // This code path is only used when inserting precisely one node. It needs more
        // comparison logic, but we can probably lean on the cases where this code path
        // is actually used.

        if (candidate) {
            return candidate;
        } else {
            return super.__appendNode(node);
        }
    }
    __appendHTML(html) {
        let candidateBounds = this.markerBounds();
        if (candidateBounds) {
            let first = candidateBounds.firstNode();
            let last = candidateBounds.lastNode();
            let newBounds = bounds(this.element, first.nextSibling, last.previousSibling);
            remove(first);
            remove(last);
            return newBounds;
        } else {
            return super.__appendHTML(html);
        }
    }
    markerBounds() {
        let _candidate = this._candidate;

        if (_candidate && isMarker(_candidate)) {
            let first = _candidate;
            let last = expect(first.nextSibling, `BUG: serialization markers must be paired`);
            while (last && !isMarker(last)) {
                last = expect(last.nextSibling, `BUG: serialization markers must be paired`);
            }
            return bounds(this.element, first, last);
        } else {
            return null;
        }
    }
    __appendText(string) {
        let candidate = this.candidate;

        if (candidate) {
            if (isEmpty$1(candidate)) {
                let next = this._candidate = remove(candidate);
                let text = this.dom.createTextNode(string);
                this.dom.insertBefore(this.element, text, next);
                return text;
            }
            if (isTextNode(candidate)) {
                candidate.nodeValue = string;
                this.lastMatchedNode = candidate;
                this._candidate = candidate.nextSibling;
                return candidate;
            } else if (candidate && (isSeparator(candidate) || isEmpty$1(candidate))) {
                this._candidate = candidate.nextSibling;
                remove(candidate);
                return this.__appendText(string);
            } else {
                this.clearMismatch(candidate);
                return super.__appendText(string);
            }
        } else {
            return super.__appendText(string);
        }
    }
    __appendComment(string) {
        let _candidate = this._candidate;

        if (_candidate && isComment(_candidate)) {
            _candidate.nodeValue = string;
            this.lastMatchedNode = _candidate;
            this._candidate = _candidate.nextSibling;
            return _candidate;
        } else if (_candidate) {
            this.clearMismatch(_candidate);
        }
        return super.__appendComment(string);
    }
    __openElement(tag, _operations) {
        let _candidate = this._candidate;

        if (_candidate && isElement(_candidate) && _candidate.tagName === tag.toUpperCase()) {
            this.unmatchedAttributes = [].slice.call(_candidate.attributes);
            this._candidate = _candidate.firstChild;
            return _candidate;
        } else if (_candidate) {
            this.clearMismatch(_candidate);
        }
        return super.__openElement(tag);
    }
    __setAttribute(name, value, namespace) {
        let unmatched = this.unmatchedAttributes;
        if (unmatched) {
            let attr = findByName(unmatched, name);
            if (attr) {
                attr.value = value;
                unmatched.splice(unmatched.indexOf(attr), 1);
                return;
            }
        }
        return super.__setAttribute(name, value, namespace);
    }
    __setProperty(name, value) {
        let unmatched = this.unmatchedAttributes;
        if (unmatched) {
            let attr = findByName(unmatched, name);
            if (attr) {
                attr.value = value;
                unmatched.splice(unmatched.indexOf(attr), 1);
                return;
            }
        }
        return super.__setProperty(name, value);
    }
    __flushElement(parent, constructing) {
        let unmatched = this.unmatchedAttributes;

        if (unmatched) {
            for (let i = 0; i < unmatched.length; i++) {
                this.constructing.removeAttribute(unmatched[i].name);
            }
            this.unmatchedAttributes = null;
        } else {
            super.__flushElement(parent, constructing);
        }
    }
    appendCautiousDynamicContent(value) {
        let content = super.appendCautiousDynamicContent(value);
        content.update(this.env, value);
        return content;
    }
    willCloseElement() {
        let candidate = this.candidate;

        if (candidate) {
            this.clearMismatch(candidate);
        }
        this._candidate = this.element.nextSibling;
        this.lastMatchedNode = this.element;
        super.willCloseElement();
    }
    pushRemoteElement(_element, _nextSibling = null) {
        throw unimplemented();
    }
    popRemoteElement() {
        throw unimplemented();
    }
    didAppendBounds(bounds$$1) {
        super.didAppendBounds(bounds$$1);
        let last = bounds$$1.lastNode();
        this._candidate = last && last.nextSibling;
        return bounds$$1;
    }
    didOpenElement(element) {
        super.didOpenElement(element);
        this._candidate = element.firstChild;
        return element;
    }
}
function isTextNode(node) {
    return node.nodeType === 3;
}
function isComment(node) {
    return node.nodeType === 8;
}
function getOpenBoundsDepth(node) {
    let boundsDepth = node.nodeValue.match(/^%\+bounds:(\d+)%$/);
    if (boundsDepth && boundsDepth[1]) {
        return Number(boundsDepth[1]);
    } else {
        return null;
    }
}
function getCloseBoundsDepth(node) {
    let boundsDepth = node.nodeValue.match(/^%\-bounds:(\d+)%$/);
    if (boundsDepth && boundsDepth[1]) {
        return Number(boundsDepth[1]);
    } else {
        return null;
    }
}
function isElement(node) {
    return node.nodeType === 1;
}
function isMarker(node) {
    return node.nodeType === 8 && node.nodeValue === '%glimmer%';
}
function isSeparator(node) {
    return node.nodeType === 8 && node.nodeValue === '%sep%';
}
function isEmpty$1(node) {
    return node.nodeType === 8 && node.nodeValue === '%empty%';
}
function remove(node) {
    let element = expect(node.parentNode, `cannot remove a detached node`);
    let next = node.nextSibling;
    element.removeChild(node);
    return next;
}
function findByName(array, name) {
    for (let i = 0; i < array.length; i++) {
        let attr = array[i];
        if (attr.name === name) return attr;
    }
    return undefined;
}
function unimplemented() {
    return new Error('Not implemented');
}

class SerializeBuilder extends NewElementBuilder {
    constructor() {
        super(...arguments);
        this.serializeBlockDepth = 0;
    }
    __openBlock() {
        let depth = this.serializeBlockDepth++;
        this.__appendComment(`%+block:${depth}%`);
        super.__openBlock();
    }
    __closeBlock() {
        super.__closeBlock();
        this.__appendComment(`%-block:${--this.serializeBlockDepth}%`);
    }
    __appendHTML(html) {
        let first = this.__appendComment('%glimmer%');
        super.__appendHTML(html);
        let last = this.__appendComment('%glimmer%');
        return bounds(this.element, first, last);
    }
    __appendText(string) {
        let current = currentNode(this);
        if (string === '') {
            return this.__appendComment('%empty%');
        } else if (current && current.nodeType === Node.TEXT_NODE) {
            this.__appendComment('%sep%');
        }
        return super.__appendText(string);
    }
}

var Opcodes;
(function (Opcodes) {
    // Statements
    Opcodes[Opcodes["Text"] = 0] = "Text";
    Opcodes[Opcodes["Append"] = 1] = "Append";
    Opcodes[Opcodes["Comment"] = 2] = "Comment";
    Opcodes[Opcodes["Modifier"] = 3] = "Modifier";
    Opcodes[Opcodes["Block"] = 4] = "Block";
    Opcodes[Opcodes["Component"] = 5] = "Component";
    Opcodes[Opcodes["OpenElement"] = 6] = "OpenElement";
    Opcodes[Opcodes["FlushElement"] = 7] = "FlushElement";
    Opcodes[Opcodes["CloseElement"] = 8] = "CloseElement";
    Opcodes[Opcodes["StaticAttr"] = 9] = "StaticAttr";
    Opcodes[Opcodes["DynamicAttr"] = 10] = "DynamicAttr";
    Opcodes[Opcodes["Yield"] = 11] = "Yield";
    Opcodes[Opcodes["Partial"] = 12] = "Partial";
    Opcodes[Opcodes["DynamicArg"] = 13] = "DynamicArg";
    Opcodes[Opcodes["StaticArg"] = 14] = "StaticArg";
    Opcodes[Opcodes["TrustingAttr"] = 15] = "TrustingAttr";
    Opcodes[Opcodes["Debugger"] = 16] = "Debugger";
    Opcodes[Opcodes["ClientSideStatement"] = 17] = "ClientSideStatement";
    // Expressions
    Opcodes[Opcodes["Unknown"] = 18] = "Unknown";
    Opcodes[Opcodes["Get"] = 19] = "Get";
    Opcodes[Opcodes["MaybeLocal"] = 20] = "MaybeLocal";
    Opcodes[Opcodes["FixThisBeforeWeMerge"] = 21] = "FixThisBeforeWeMerge";
    Opcodes[Opcodes["HasBlock"] = 22] = "HasBlock";
    Opcodes[Opcodes["HasBlockParams"] = 23] = "HasBlockParams";
    Opcodes[Opcodes["Undefined"] = 24] = "Undefined";
    Opcodes[Opcodes["Helper"] = 25] = "Helper";
    Opcodes[Opcodes["Concat"] = 26] = "Concat";
    Opcodes[Opcodes["ClientSideExpression"] = 27] = "ClientSideExpression";
})(Opcodes || (Opcodes = {}));

function is(variant) {
    return function (value) {
        return Array.isArray(value) && value[0] === variant;
    };
}
var Expressions;
(function (Expressions) {
    Expressions.isUnknown = is(Opcodes.Unknown);
    Expressions.isGet = is(Opcodes.Get);
    Expressions.isConcat = is(Opcodes.Concat);
    Expressions.isHelper = is(Opcodes.Helper);
    Expressions.isHasBlock = is(Opcodes.HasBlock);
    Expressions.isHasBlockParams = is(Opcodes.HasBlockParams);
    Expressions.isUndefined = is(Opcodes.Undefined);
    Expressions.isClientSide = is(Opcodes.ClientSideExpression);
    Expressions.isMaybeLocal = is(Opcodes.MaybeLocal);
    function isPrimitiveValue(value) {
        if (value === null) {
            return true;
        }
        return typeof value !== 'object';
    }
    Expressions.isPrimitiveValue = isPrimitiveValue;
})(Expressions || (Expressions = {}));
var Statements;
(function (Statements) {
    Statements.isText = is(Opcodes.Text);
    Statements.isAppend = is(Opcodes.Append);
    Statements.isComment = is(Opcodes.Comment);
    Statements.isModifier = is(Opcodes.Modifier);
    Statements.isBlock = is(Opcodes.Block);
    Statements.isComponent = is(Opcodes.Component);
    Statements.isOpenElement = is(Opcodes.OpenElement);
    Statements.isFlushElement = is(Opcodes.FlushElement);
    Statements.isCloseElement = is(Opcodes.CloseElement);
    Statements.isStaticAttr = is(Opcodes.StaticAttr);
    Statements.isDynamicAttr = is(Opcodes.DynamicAttr);
    Statements.isYield = is(Opcodes.Yield);
    Statements.isPartial = is(Opcodes.Partial);
    Statements.isDynamicArg = is(Opcodes.DynamicArg);
    Statements.isStaticArg = is(Opcodes.StaticArg);
    Statements.isTrustingAttr = is(Opcodes.TrustingAttr);
    Statements.isDebugger = is(Opcodes.Debugger);
    Statements.isClientSide = is(Opcodes.ClientSideStatement);
    function isAttribute(val) {
        return val[0] === Opcodes.StaticAttr || val[0] === Opcodes.DynamicAttr || val[0] === Opcodes.TrustingAttr;
    }
    Statements.isAttribute = isAttribute;
    function isArgument(val) {
        return val[0] === Opcodes.StaticArg || val[0] === Opcodes.DynamicArg;
    }
    Statements.isArgument = isArgument;
    function isParameter(val) {
        return isAttribute(val) || isArgument(val);
    }
    Statements.isParameter = isParameter;
    function getParameterName(s) {
        return s[1];
    }
    Statements.getParameterName = getParameterName;
})(Statements || (Statements = {}));

var Ops$1;
(function (Ops) {
    Ops[Ops["OpenComponentElement"] = 0] = "OpenComponentElement";
    Ops[Ops["DidCreateElement"] = 1] = "DidCreateElement";
    Ops[Ops["SetComponentAttrs"] = 2] = "SetComponentAttrs";
    Ops[Ops["DidRenderLayout"] = 3] = "DidRenderLayout";
    Ops[Ops["FunctionExpression"] = 4] = "FunctionExpression";
    Ops[Ops["Debugger"] = 5] = "Debugger";
})(Ops$1 || (Ops$1 = {}));

class CompiledStaticTemplate {
    constructor(handle) {
        this.handle = handle;
    }
}
class CompiledDynamicTemplate {
    constructor(handle, symbolTable) {
        this.handle = handle;
        this.symbolTable = symbolTable;
    }
}

function compileLayout(compilable, env) {
    let builder = new ComponentLayoutBuilder(env);
    compilable.compile(builder);
    return builder.compile();
}
class ComponentLayoutBuilder {
    constructor(env) {
        this.env = env;
    }
    wrapLayout(layout) {
        this.inner = new WrappedBuilder(this.env, layout);
    }
    fromLayout(componentName, layout) {
        this.inner = new UnwrappedBuilder(this.env, componentName, layout);
    }
    compile() {
        return this.inner.compile();
    }
    get tag() {
        return this.inner.tag;
    }
    get attrs() {
        return this.inner.attrs;
    }
}
class WrappedBuilder {
    constructor(env, layout) {
        this.env = env;
        this.layout = layout;
        this.tag = new ComponentTagBuilder();
        this.attrs = new ComponentAttrsBuilder();
    }
    compile() {
        //========DYNAMIC
        //        PutValue(TagExpr)
        //        Test
        //        JumpUnless(BODY)
        //        OpenDynamicPrimitiveElement
        //        DidCreateElement
        //        ...attr statements...
        //        FlushElement
        // BODY:  Noop
        //        ...body statements...
        //        PutValue(TagExpr)
        //        Test
        //        JumpUnless(END)
        //        CloseElement
        // END:   Noop
        //        DidRenderLayout
        //        Exit
        //
        //========STATIC
        //        OpenPrimitiveElementOpcode
        //        DidCreateElement
        //        ...attr statements...
        //        FlushElement
        //        ...body statements...
        //        CloseElement
        //        DidRenderLayout
        //        Exit
        let env = this.env,
            layout = this.layout;

        let meta = { templateMeta: layout.meta, symbols: layout.symbols, asPartial: false };
        let dynamicTag = this.tag.getDynamic();
        let staticTag = this.tag.getStatic();
        let b = builder(env, meta);
        b.startLabels();
        if (dynamicTag) {
            b.fetch(Register.s1);
            expr(dynamicTag, b);
            b.dup();
            b.load(Register.s1);
            b.test('simple');
            b.jumpUnless('BODY');
            b.fetch(Register.s1);
            b.putComponentOperations();
            b.openDynamicElement();
        } else if (staticTag) {
            b.putComponentOperations();
            b.openElementWithOperations(staticTag);
        }
        if (dynamicTag || staticTag) {
            b.didCreateElement(Register.s0);
            let attrs = this.attrs.buffer;
            b.setComponentAttrs(true);
            for (let i = 0; i < attrs.length; i++) {
                compileStatement(attrs[i], b);
            }
            b.setComponentAttrs(false);
            b.flushElement();
        }
        b.label('BODY');
        b.invokeStatic(layout.asBlock());
        if (dynamicTag) {
            b.fetch(Register.s1);
            b.test('simple');
            b.jumpUnless('END');
            b.closeElement();
        } else if (staticTag) {
            b.closeElement();
        }
        b.label('END');
        b.didRenderLayout(Register.s0);
        if (dynamicTag) {
            b.load(Register.s1);
        }
        b.stopLabels();
        let start = b.start;
        let end = b.finalize();
        return new CompiledDynamicTemplate(start, {
            meta,
            hasEval: layout.hasEval,
            symbols: layout.symbols.concat([ATTRS_BLOCK])
        });
    }
}
class UnwrappedBuilder {
    constructor(env, componentName, layout) {
        this.env = env;
        this.componentName = componentName;
        this.layout = layout;
        this.attrs = new ComponentAttrsBuilder();
    }
    get tag() {
        throw new Error('BUG: Cannot call `tag` on an UnwrappedBuilder');
    }
    compile() {
        let env = this.env,
            layout = this.layout;

        return layout.asLayout(this.componentName, this.attrs.buffer).compileDynamic(env);
    }
}
class ComponentTagBuilder {
    constructor() {
        this.isDynamic = null;
        this.isStatic = null;
        this.staticTagName = null;
        this.dynamicTagName = null;
    }
    getDynamic() {
        if (this.isDynamic) {
            return this.dynamicTagName;
        }
    }
    getStatic() {
        if (this.isStatic) {
            return this.staticTagName;
        }
    }
    static(tagName) {
        this.isStatic = true;
        this.staticTagName = tagName;
    }
    dynamic(tagName) {
        this.isDynamic = true;
        this.dynamicTagName = [Opcodes.ClientSideExpression, Ops$1.FunctionExpression, tagName];
    }
}
class ComponentAttrsBuilder {
    constructor() {
        this.buffer = [];
    }
    static(name, value) {
        this.buffer.push([Opcodes.StaticAttr, name, value, null]);
    }
    dynamic(name, value) {
        this.buffer.push([Opcodes.DynamicAttr, name, [Opcodes.ClientSideExpression, Ops$1.FunctionExpression, value], null]);
    }
}
class ComponentBuilder {
    constructor(builder) {
        this.builder = builder;
        this.env = builder.env;
    }
    static(definition, args) {
        let params = args[0],
            hash = args[1],
            _default = args[2],
            inverse = args[3];
        let builder = this.builder;

        builder.pushComponentManager(definition);
        builder.invokeComponent(null, params, hash, _default, inverse);
    }
    dynamic(definitionArgs, getDefinition, args) {
        let params = args[0],
            hash = args[1],
            block = args[2],
            inverse = args[3];
        let builder = this.builder;

        if (!definitionArgs || definitionArgs.length === 0) {
            throw new Error("Dynamic syntax without an argument");
        }
        let meta = this.builder.meta.templateMeta;
        function helper(vm, a) {
            return getDefinition(vm, a, meta);
        }
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        builder.compileArgs(definitionArgs[0], definitionArgs[1], true);
        builder.helper(helper);
        builder.dup();
        builder.test('simple');
        builder.enter(2);
        builder.jumpUnless('ELSE');
        builder.pushDynamicComponentManager();
        builder.invokeComponent(null, params, hash, block, inverse);
        builder.label('ELSE');
        builder.exit();
        builder.return();
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    }
}
function builder(env, meta) {
    return new OpcodeBuilder(env, meta);
}

class RawInlineBlock {
    constructor(meta, statements, parameters) {
        this.meta = meta;
        this.statements = statements;
        this.parameters = parameters;
    }
    scan() {
        return new CompilableTemplate(this.statements, { parameters: this.parameters, meta: this.meta });
    }
}

class Labels {
    constructor() {
        this.labels = dict();
        this.targets = [];
    }
    label(name, index) {
        this.labels[name] = index;
    }
    target(at, Target, target) {
        this.targets.push({ at, Target, target });
    }
    patch(program) {
        let targets = this.targets,
            labels = this.labels;

        for (let i = 0; i < targets.length; i++) {
            var _targets$i = targets[i];
            let at = _targets$i.at,
                target = _targets$i.target;

            let goto = labels[target] - at;
            program.heap.setbyaddr(at + 1, goto);
        }
    }
}
class BasicOpcodeBuilder {
    constructor(env, meta, program) {
        this.env = env;
        this.meta = meta;
        this.program = program;
        this.labelsStack = new Stack();
        this.isComponentAttrs = false;
        this.constants = program.constants;
        this.heap = program.heap;
        this.start = this.heap.malloc();
    }
    get pos() {
        return typePos(this.heap.size());
    }
    get nextPos() {
        return this.heap.size();
    }
    upvars(count) {
        return fillNulls(count);
    }
    reserve(name) {
        this.push(name, 0, 0, 0);
    }
    push(name, op1 = 0, op2 = 0, op3 = 0) {
        this.heap.push(name);
        this.heap.push(op1);
        this.heap.push(op2);
        this.heap.push(op3);
    }
    finalize() {
        this.push(22 /* Return */);
        this.heap.finishMalloc(this.start);
        return this.start;
    }
    setComponentAttrs(enabled) {
        this.isComponentAttrs = enabled;
    }
    // args
    pushArgs(synthetic) {
        this.push(58 /* PushArgs */, synthetic === true ? 1 : 0);
    }
    // helpers
    get labels() {
        return expect(this.labelsStack.current, 'bug: not in a label stack');
    }
    startLabels() {
        this.labelsStack.push(new Labels());
    }
    stopLabels() {
        let label = expect(this.labelsStack.pop(), 'unbalanced push and pop labels');
        label.patch(this.program);
    }
    // components
    pushComponentManager(definition) {
        this.push(56 /* PushComponentManager */, this.other(definition));
    }
    pushDynamicComponentManager() {
        this.push(57 /* PushDynamicComponentManager */);
    }
    prepareArgs(state) {
        this.push(59 /* PrepareArgs */, state);
    }
    createComponent(state, hasDefault, hasInverse) {
        let flag = (hasDefault === true ? 1 : 0) | (hasInverse === true ? 1 : 0) << 1;
        this.push(60 /* CreateComponent */, flag, state);
    }
    registerComponentDestructor(state) {
        this.push(61 /* RegisterComponentDestructor */, state);
    }
    beginComponentTransaction() {
        this.push(65 /* BeginComponentTransaction */);
    }
    commitComponentTransaction() {
        this.push(66 /* CommitComponentTransaction */);
    }
    putComponentOperations() {
        this.push(62 /* PutComponentOperations */);
    }
    getComponentSelf(state) {
        this.push(63 /* GetComponentSelf */, state);
    }
    getComponentLayout(state) {
        this.push(64 /* GetComponentLayout */, state);
    }
    didCreateElement(state) {
        this.push(67 /* DidCreateElement */, state);
    }
    didRenderLayout(state) {
        this.push(68 /* DidRenderLayout */, state);
    }
    // partial
    getPartialTemplate() {
        this.push(69 /* GetPartialTemplate */);
    }
    resolveMaybeLocal(name) {
        this.push(70 /* ResolveMaybeLocal */, this.string(name));
    }
    // debugger
    debugger(symbols, evalInfo) {
        this.push(71 /* Debugger */, this.constants.other(symbols), this.constants.array(evalInfo));
    }
    // content
    dynamicContent(isTrusting) {
        this.push(26 /* DynamicContent */, isTrusting ? 1 : 0);
    }
    // dom
    text(text) {
        this.push(24 /* Text */, this.constants.string(text));
    }
    openPrimitiveElement(tag) {
        this.push(27 /* OpenElement */, this.constants.string(tag));
    }
    openElementWithOperations(tag) {
        this.push(28 /* OpenElementWithOperations */, this.constants.string(tag));
    }
    openDynamicElement() {
        this.push(29 /* OpenDynamicElement */);
    }
    flushElement() {
        this.push(33 /* FlushElement */);
    }
    closeElement() {
        this.push(34 /* CloseElement */);
    }
    staticAttr(_name, _namespace, _value) {
        let name = this.constants.string(_name);
        let namespace = _namespace ? this.constants.string(_namespace) : 0;
        if (this.isComponentAttrs) {
            this.primitive(_value);
            this.push(32 /* ComponentAttr */, name, 1, namespace);
        } else {
            let value = this.constants.string(_value);
            this.push(30 /* StaticAttr */, name, value, namespace);
        }
    }
    dynamicAttr(_name, _namespace, trusting) {
        let name = this.constants.string(_name);
        let namespace = _namespace ? this.constants.string(_namespace) : 0;
        if (this.isComponentAttrs) {
            this.push(32 /* ComponentAttr */, name, trusting === true ? 1 : 0, namespace);
        } else {
            this.push(31 /* DynamicAttr */, name, trusting === true ? 1 : 0, namespace);
        }
    }
    comment(_comment) {
        let comment = this.constants.string(_comment);
        this.push(25 /* Comment */, comment);
    }
    modifier(_definition) {
        this.push(35 /* Modifier */, this.other(_definition));
    }
    // lists
    putIterator() {
        this.push(54 /* PutIterator */);
    }
    enterList(start) {
        this.reserve(52 /* EnterList */);
        this.labels.target(this.pos, 52 /* EnterList */, start);
    }
    exitList() {
        this.push(53 /* ExitList */);
    }
    iterate(breaks) {
        this.reserve(55 /* Iterate */);
        this.labels.target(this.pos, 55 /* Iterate */, breaks);
    }
    // expressions
    setVariable(symbol) {
        this.push(4 /* SetVariable */, symbol);
    }
    getVariable(symbol) {
        this.push(5 /* GetVariable */, symbol);
    }
    getProperty(key) {
        this.push(6 /* GetProperty */, this.string(key));
    }
    getBlock(symbol) {
        this.push(8 /* GetBlock */, symbol);
    }
    hasBlock(symbol) {
        this.push(9 /* HasBlock */, symbol);
    }
    hasBlockParams(symbol) {
        this.push(10 /* HasBlockParams */, symbol);
    }
    concat(size) {
        this.push(11 /* Concat */, size);
    }
    function(f) {
        this.push(2 /* Function */, this.func(f));
    }
    load(register) {
        this.push(17 /* Load */, register);
    }
    fetch(register) {
        this.push(18 /* Fetch */, register);
    }
    dup(register = Register.sp, offset = 0) {
        return this.push(15 /* Dup */, register, offset);
    }
    pop(count = 1) {
        return this.push(16 /* Pop */, count);
    }
    // vm
    pushRemoteElement() {
        this.push(36 /* PushRemoteElement */);
    }
    popRemoteElement() {
        this.push(37 /* PopRemoteElement */);
    }
    label(name) {
        this.labels.label(name, this.nextPos);
    }
    pushRootScope(symbols, bindCallerScope) {
        this.push(19 /* RootScope */, symbols, bindCallerScope ? 1 : 0);
    }
    pushChildScope() {
        this.push(20 /* ChildScope */);
    }
    popScope() {
        this.push(21 /* PopScope */);
    }
    returnTo(label) {
        this.reserve(23 /* ReturnTo */);
        this.labels.target(this.pos, 23 /* ReturnTo */, label);
    }
    pushDynamicScope() {
        this.push(39 /* PushDynamicScope */);
    }
    popDynamicScope() {
        this.push(40 /* PopDynamicScope */);
    }
    pushImmediate(value) {
        this.push(13 /* Constant */, this.other(value));
    }
    primitive(_primitive) {
        let flag = 0;
        let primitive;
        switch (typeof _primitive) {
            case 'number':
                primitive = _primitive;
                break;
            case 'string':
                primitive = this.string(_primitive);
                flag = 1;
                break;
            case 'boolean':
                primitive = _primitive | 0;
                flag = 2;
                break;
            case 'object':
                // assume null
                primitive = 2;
                flag = 2;
                break;
            case 'undefined':
                primitive = 3;
                flag = 2;
                break;
            default:
                throw new Error('Invalid primitive passed to pushPrimitive');
        }
        this.push(14 /* PrimitiveReference */, flag << 30 | primitive);
    }
    helper(func) {
        this.push(1 /* Helper */, this.func(func));
    }
    pushBlock(block) {
        this.push(7 /* PushBlock */, this.block(block));
    }
    bindDynamicScope(_names) {
        this.push(38 /* BindDynamicScope */, this.names(_names));
    }
    enter(args) {
        this.push(49 /* Enter */, args);
    }
    exit() {
        this.push(50 /* Exit */);
    }
    return() {
        this.push(22 /* Return */);
    }
    pushFrame() {
        this.push(47 /* PushFrame */);
    }
    popFrame() {
        this.push(48 /* PopFrame */);
    }
    compileDynamicBlock() {
        this.push(41 /* CompileDynamicBlock */);
    }
    invokeDynamic(invoker) {
        this.push(43 /* InvokeDynamic */, this.other(invoker));
    }
    invokeStatic(block, callerCount = 0) {
        let parameters = block.symbolTable.parameters;

        let calleeCount = parameters.length;
        let count = Math.min(callerCount, calleeCount);
        this.pushFrame();
        if (count) {
            this.pushChildScope();
            for (let i = 0; i < count; i++) {
                this.dup(Register.fp, callerCount - i);
                this.setVariable(parameters[i]);
            }
        }
        let _block = this.constants.block(block);
        this.push(42 /* InvokeStatic */, _block);
        if (count) {
            this.popScope();
        }
        this.popFrame();
    }
    test(testFunc) {
        let _func;
        if (testFunc === 'const') {
            _func = ConstTest;
        } else if (testFunc === 'simple') {
            _func = SimpleTest;
        } else if (testFunc === 'environment') {
            _func = EnvironmentTest;
        } else if (typeof testFunc === 'function') {
            _func = testFunc;
        } else {
            throw new Error('unreachable');
        }
        let func = this.constants.function(_func);
        this.push(51 /* Test */, func);
    }
    jump(target) {
        this.reserve(44 /* Jump */);
        this.labels.target(this.pos, 44 /* Jump */, target);
    }
    jumpIf(target) {
        this.reserve(45 /* JumpIf */);
        this.labels.target(this.pos, 45 /* JumpIf */, target);
    }
    jumpUnless(target) {
        this.reserve(46 /* JumpUnless */);
        this.labels.target(this.pos, 46 /* JumpUnless */, target);
    }
    string(_string) {
        return this.constants.string(_string);
    }
    names(_names) {
        let names = [];
        for (let i = 0; i < _names.length; i++) {
            let n = _names[i];
            names[i] = this.constants.string(n);
        }
        return this.constants.array(names);
    }
    symbols(symbols) {
        return this.constants.array(symbols);
    }
    other(value) {
        return this.constants.other(value);
    }
    block(block) {
        return block ? this.constants.block(block) : 0;
    }
    func(func) {
        return this.constants.function(func);
    }
}
function isCompilableExpression(expr$$1) {
    return typeof expr$$1 === 'object' && expr$$1 !== null && typeof expr$$1.compile === 'function';
}
class OpcodeBuilder extends BasicOpcodeBuilder {
    constructor(env, meta, program = env.program) {
        super(env, meta, program);
        this.component = new ComponentBuilder(this);
    }
    compileArgs(params, hash, synthetic) {
        let positional = 0;
        if (params) {
            for (let i = 0; i < params.length; i++) {
                expr(params[i], this);
            }
            positional = params.length;
        }
        this.pushImmediate(positional);
        let names = EMPTY_ARRAY;
        if (hash) {
            names = hash[0];
            let val = hash[1];
            for (let i = 0; i < val.length; i++) {
                expr(val[i], this);
            }
        }
        this.pushImmediate(names);
        this.pushArgs(synthetic);
    }
    compile(expr$$1) {
        if (isCompilableExpression(expr$$1)) {
            return expr$$1.compile(this);
        } else {
            return expr$$1;
        }
    }
    guardedAppend(expression, trusting) {
        this.startLabels();
        this.pushFrame();
        this.returnTo('END');
        expr(expression, this);
        this.dup();
        this.test(reference => {
            return IsComponentDefinitionReference.create(reference);
        });
        this.enter(2);
        this.jumpUnless('ELSE');
        this.pushDynamicComponentManager();
        this.invokeComponent(null, null, null, null, null);
        this.exit();
        this.return();
        this.label('ELSE');
        this.dynamicContent(trusting);
        this.exit();
        this.return();
        this.label('END');
        this.popFrame();
        this.stopLabels();
    }
    invokeComponent(attrs, params, hash, block, inverse = null) {
        this.fetch(Register.s0);
        this.dup(Register.sp, 1);
        this.load(Register.s0);
        this.pushBlock(block);
        this.pushBlock(inverse);
        this.compileArgs(params, hash, false);
        this.prepareArgs(Register.s0);
        this.beginComponentTransaction();
        this.pushDynamicScope();
        this.createComponent(Register.s0, block !== null, inverse !== null);
        this.registerComponentDestructor(Register.s0);
        this.getComponentSelf(Register.s0);
        this.getComponentLayout(Register.s0);
        this.invokeDynamic(new InvokeDynamicLayout(attrs && attrs.scan()));
        this.popFrame();
        this.popScope();
        this.popDynamicScope();
        this.commitComponentTransaction();
        this.load(Register.s0);
    }
    template(block) {
        if (!block) return null;
        return new RawInlineBlock(this.meta, block.statements, block.parameters);
    }
}

var Ops$2 = Opcodes;
const ATTRS_BLOCK = '&attrs';
class Compilers {
    constructor(offset = 0) {
        this.offset = offset;
        this.names = dict();
        this.funcs = [];
    }
    add(name, func) {
        this.funcs.push(func);
        this.names[name] = this.funcs.length - 1;
    }
    compile(sexp, builder) {
        let name = sexp[this.offset];
        let index = this.names[name];
        let func = this.funcs[index];
        debugAssert(!!func, `expected an implementation for ${this.offset === 0 ? Ops$2[sexp[0]] : Ops$1[sexp[1]]}`);
        func(sexp, builder);
    }
}
const STATEMENTS = new Compilers();
const CLIENT_SIDE = new Compilers(1);
STATEMENTS.add(Ops$2.Text, (sexp, builder) => {
    builder.text(sexp[1]);
});
STATEMENTS.add(Ops$2.Comment, (sexp, builder) => {
    builder.comment(sexp[1]);
});
STATEMENTS.add(Ops$2.CloseElement, (_sexp, builder) => {
    builder.closeElement();
});
STATEMENTS.add(Ops$2.FlushElement, (_sexp, builder) => {
    builder.flushElement();
});
STATEMENTS.add(Ops$2.Modifier, (sexp, builder) => {
    let env = builder.env,
        meta = builder.meta;
    let name = sexp[1],
        params = sexp[2],
        hash = sexp[3];

    if (env.hasModifier(name, meta.templateMeta)) {
        builder.compileArgs(params, hash, true);
        builder.modifier(env.lookupModifier(name, meta.templateMeta));
    } else {
        throw new Error(`Compile Error ${name} is not a modifier: Helpers may not be used in the element form.`);
    }
});
STATEMENTS.add(Ops$2.StaticAttr, (sexp, builder) => {
    let name = sexp[1],
        value = sexp[2],
        namespace = sexp[3];

    builder.staticAttr(name, namespace, value);
});
STATEMENTS.add(Ops$2.DynamicAttr, (sexp, builder) => {
    dynamicAttr(sexp, false, builder);
});
STATEMENTS.add(Ops$2.TrustingAttr, (sexp, builder) => {
    dynamicAttr(sexp, true, builder);
});
function dynamicAttr(sexp, trusting, builder) {
    let name = sexp[1],
        value = sexp[2],
        namespace = sexp[3];

    expr(value, builder);
    if (namespace) {
        builder.dynamicAttr(name, namespace, trusting);
    } else {
        builder.dynamicAttr(name, null, trusting);
    }
}
STATEMENTS.add(Ops$2.OpenElement, (sexp, builder) => {
    builder.openPrimitiveElement(sexp[1]);
});
CLIENT_SIDE.add(Ops$1.OpenComponentElement, (sexp, builder) => {
    builder.putComponentOperations();
    builder.openElementWithOperations(sexp[2]);
});
CLIENT_SIDE.add(Ops$1.DidCreateElement, (_sexp, builder) => {
    builder.didCreateElement(Register.s0);
});
CLIENT_SIDE.add(Ops$1.SetComponentAttrs, (sexp, builder) => {
    builder.setComponentAttrs(sexp[2]);
});
CLIENT_SIDE.add(Ops$1.Debugger, () => {
    // tslint:disable-next-line:no-debugger
    debugger;
});
CLIENT_SIDE.add(Ops$1.DidRenderLayout, (_sexp, builder) => {
    builder.didRenderLayout(Register.s0);
});
STATEMENTS.add(Ops$2.Append, (sexp, builder) => {
    let value = sexp[1],
        trusting = sexp[2];

    var _builder$env$macros = builder.env.macros();

    let inlines = _builder$env$macros.inlines;

    let returned = inlines.compile(sexp, builder) || value;
    if (returned === true) return;
    let isGet = E.isGet(value);
    let isMaybeLocal = E.isMaybeLocal(value);
    if (trusting) {
        builder.guardedAppend(value, true);
    } else {
        if (isGet || isMaybeLocal) {
            builder.guardedAppend(value, false);
        } else {
            expr(value, builder);
            builder.dynamicContent(false);
        }
    }
});
STATEMENTS.add(Ops$2.Block, (sexp, builder) => {
    let name = sexp[1],
        params = sexp[2],
        hash = sexp[3],
        _template = sexp[4],
        _inverse = sexp[5];

    let template = builder.template(_template);
    let inverse = builder.template(_inverse);
    let templateBlock = template && template.scan();
    let inverseBlock = inverse && inverse.scan();

    var _builder$env$macros2 = builder.env.macros();

    let blocks = _builder$env$macros2.blocks;

    blocks.compile(name, params, hash, templateBlock, inverseBlock, builder);
});
class InvokeDynamicLayout {
    constructor(attrs) {
        this.attrs = attrs;
    }
    invoke(vm, layout) {
        var _layout$symbolTable = layout.symbolTable;
        let symbols = _layout$symbolTable.symbols,
            hasEval = _layout$symbolTable.hasEval;

        let stack = vm.stack;
        let scope = vm.pushRootScope(symbols.length + 1, true);
        scope.bindSelf(stack.pop());
        scope.bindBlock(symbols.indexOf(ATTRS_BLOCK) + 1, this.attrs);
        let lookup = null;
        let $eval = -1;
        if (hasEval) {
            $eval = symbols.indexOf('$eval') + 1;
            lookup = dict();
        }
        let callerNames = stack.pop();
        for (let i = callerNames.length - 1; i >= 0; i--) {
            let symbol = symbols.indexOf(callerNames[i]);
            let value = stack.pop();
            if (symbol !== -1) scope.bindSymbol(symbol + 1, value);
            if (hasEval) lookup[callerNames[i]] = value;
        }
        let numPositionalArgs = stack.pop();
        debugAssert(typeof numPositionalArgs === 'number', '[BUG] Incorrect value of positional argument count found during invoke-dynamic-layout.');
        // Currently we don't support accessing positional args in templates, so just throw them away
        stack.pop(numPositionalArgs);
        let inverseSymbol = symbols.indexOf('&inverse');
        let inverse = stack.pop();
        if (inverseSymbol !== -1) {
            scope.bindBlock(inverseSymbol + 1, inverse);
        }
        if (lookup) lookup['&inverse'] = inverse;
        let defaultSymbol = symbols.indexOf('&default');
        let defaultBlock = stack.pop();
        if (defaultSymbol !== -1) {
            scope.bindBlock(defaultSymbol + 1, defaultBlock);
        }
        if (lookup) lookup['&default'] = defaultBlock;
        if (lookup) scope.bindEvalScope(lookup);
        vm.pushFrame();
        vm.call(layout.handle);
    }
    toJSON() {
        return { GlimmerDebug: '<invoke-dynamic-layout>' };
    }
}
STATEMENTS.add(Ops$2.Component, (sexp, builder) => {
    let tag = sexp[1],
        _attrs = sexp[2],
        args = sexp[3],
        block = sexp[4];

    if (builder.env.hasComponentDefinition(tag, builder.meta.templateMeta)) {
        let child = builder.template(block);
        let attrs = [[Ops$2.ClientSideStatement, Ops$1.SetComponentAttrs, true], ..._attrs, [Ops$2.ClientSideStatement, Ops$1.SetComponentAttrs, false]];
        let attrsBlock = new RawInlineBlock(builder.meta, attrs, EMPTY_ARRAY);
        let definition = builder.env.getComponentDefinition(tag, builder.meta.templateMeta);
        builder.pushComponentManager(definition);
        builder.invokeComponent(attrsBlock, null, args, child && child.scan());
    } else if (block && block.parameters.length) {
        throw new Error(`Compile Error: Cannot find component ${tag}`);
    } else {
        builder.openPrimitiveElement(tag);
        for (let i = 0; i < _attrs.length; i++) {
            STATEMENTS.compile(_attrs[i], builder);
        }
        builder.flushElement();
        if (block) {
            let stmts = block.statements;
            for (let i = 0; i < stmts.length; i++) {
                STATEMENTS.compile(stmts[i], builder);
            }
        }
        builder.closeElement();
    }
});
class PartialInvoker {
    constructor(outerSymbols, evalInfo) {
        this.outerSymbols = outerSymbols;
        this.evalInfo = evalInfo;
    }
    invoke(vm, _partial) {
        let partial = unwrap(_partial);
        let partialSymbols = partial.symbolTable.symbols;
        let outerScope = vm.scope();
        let partialScope = vm.pushRootScope(partialSymbols.length, false);
        partialScope.bindCallerScope(outerScope.getCallerScope());
        partialScope.bindEvalScope(outerScope.getEvalScope());
        partialScope.bindSelf(outerScope.getSelf());
        let evalInfo = this.evalInfo,
            outerSymbols = this.outerSymbols;

        let locals = dict();
        for (let i = 0; i < evalInfo.length; i++) {
            let slot = evalInfo[i];
            let name = outerSymbols[slot - 1];
            let ref = outerScope.getSymbol(slot);
            locals[name] = ref;
        }
        let evalScope = outerScope.getEvalScope();
        for (let i = 0; i < partialSymbols.length; i++) {
            let name = partialSymbols[i];
            let symbol = i + 1;
            let value = evalScope[name];
            if (value !== undefined) partialScope.bind(symbol, value);
        }
        partialScope.bindPartialMap(locals);
        vm.pushFrame();
        vm.call(partial.handle);
    }
}
STATEMENTS.add(Ops$2.Partial, (sexp, builder) => {
    let name = sexp[1],
        evalInfo = sexp[2];
    var _builder$meta = builder.meta;
    let templateMeta = _builder$meta.templateMeta,
        symbols = _builder$meta.symbols;

    function helper(vm, args) {
        let env = vm.env;

        let nameRef = args.positional.at(0);
        return map(nameRef, n => {
            if (typeof n === 'string' && n) {
                if (!env.hasPartial(n, templateMeta)) {
                    throw new Error(`Could not find a partial named "${n}"`);
                }
                return env.lookupPartial(n, templateMeta);
            } else if (n) {
                throw new Error(`Could not find a partial named "${String(n)}"`);
            } else {
                return null;
            }
        });
    }
    builder.startLabels();
    builder.pushFrame();
    builder.returnTo('END');
    expr(name, builder);
    builder.pushImmediate(1);
    builder.pushImmediate(EMPTY_ARRAY);
    builder.pushArgs(true);
    builder.helper(helper);
    builder.dup();
    builder.test('simple');
    builder.enter(2);
    builder.jumpUnless('ELSE');
    builder.getPartialTemplate();
    builder.compileDynamicBlock();
    builder.invokeDynamic(new PartialInvoker(symbols, evalInfo));
    builder.popScope();
    builder.popFrame();
    builder.label('ELSE');
    builder.exit();
    builder.return();
    builder.label('END');
    builder.popFrame();
    builder.stopLabels();
});
class InvokeDynamicYield {
    constructor(callerCount) {
        this.callerCount = callerCount;
    }
    invoke(vm, block) {
        let callerCount = this.callerCount;

        let stack = vm.stack;
        if (!block) {
            // To balance the pop{Frame,Scope}
            vm.pushFrame();
            vm.pushCallerScope();
            return;
        }
        let table = block.symbolTable;
        let locals = table.parameters; // always present in inline blocks
        let calleeCount = locals ? locals.length : 0;
        let count = Math.min(callerCount, calleeCount);
        vm.pushFrame();
        vm.pushCallerScope(calleeCount > 0);
        let scope = vm.scope();
        for (let i = 0; i < count; i++) {
            scope.bindSymbol(locals[i], stack.fromBase(callerCount - i));
        }
        vm.call(block.handle);
    }
    toJSON() {
        return { GlimmerDebug: `<invoke-dynamic-yield caller-count=${this.callerCount}>` };
    }
}
STATEMENTS.add(Ops$2.Yield, (sexp, builder) => {
    let to = sexp[1],
        params = sexp[2];

    let count = compileList(params, builder);
    builder.getBlock(to);
    builder.compileDynamicBlock();
    builder.invokeDynamic(new InvokeDynamicYield(count));
    builder.popScope();
    builder.popFrame();
    if (count) {
        builder.pop(count);
    }
});
STATEMENTS.add(Ops$2.Debugger, (sexp, builder) => {
    let evalInfo = sexp[1];

    builder.debugger(builder.meta.symbols, evalInfo);
});
STATEMENTS.add(Ops$2.ClientSideStatement, (sexp, builder) => {
    CLIENT_SIDE.compile(sexp, builder);
});
const EXPRESSIONS = new Compilers();
const CLIENT_SIDE_EXPRS = new Compilers(1);
var E = Expressions;
function expr(expression, builder) {
    if (Array.isArray(expression)) {
        EXPRESSIONS.compile(expression, builder);
    } else {
        builder.primitive(expression);
    }
}
EXPRESSIONS.add(Ops$2.Unknown, (sexp, builder) => {
    let name = sexp[1];
    if (builder.env.hasHelper(name, builder.meta.templateMeta)) {
        EXPRESSIONS.compile([Ops$2.Helper, name, EMPTY_ARRAY, null], builder);
    } else if (builder.meta.asPartial) {
        builder.resolveMaybeLocal(name);
    } else {
        builder.getVariable(0);
        builder.getProperty(name);
    }
});
EXPRESSIONS.add(Ops$2.Concat, (sexp, builder) => {
    let parts = sexp[1];
    for (let i = 0; i < parts.length; i++) {
        expr(parts[i], builder);
    }
    builder.concat(parts.length);
});
CLIENT_SIDE_EXPRS.add(Ops$1.FunctionExpression, (sexp, builder) => {
    builder.function(sexp[2]);
});
EXPRESSIONS.add(Ops$2.Helper, (sexp, builder) => {
    let env = builder.env,
        meta = builder.meta;
    let name = sexp[1],
        params = sexp[2],
        hash = sexp[3];

    if (env.hasHelper(name, meta.templateMeta)) {
        builder.compileArgs(params, hash, true);
        builder.helper(env.lookupHelper(name, meta.templateMeta));
    } else {
        throw new Error(`Compile Error: ${name} is not a helper`);
    }
});
EXPRESSIONS.add(Ops$2.Get, (sexp, builder) => {
    let head = sexp[1],
        path = sexp[2];

    builder.getVariable(head);
    for (let i = 0; i < path.length; i++) {
        builder.getProperty(path[i]);
    }
});
EXPRESSIONS.add(Ops$2.MaybeLocal, (sexp, builder) => {
    let path = sexp[1];

    if (builder.meta.asPartial) {
        let head = path[0];
        path = path.slice(1);
        builder.resolveMaybeLocal(head);
    } else {
        builder.getVariable(0);
    }
    for (let i = 0; i < path.length; i++) {
        builder.getProperty(path[i]);
    }
});
EXPRESSIONS.add(Ops$2.Undefined, (_sexp, builder) => {
    return builder.primitive(undefined);
});
EXPRESSIONS.add(Ops$2.HasBlock, (sexp, builder) => {
    builder.hasBlock(sexp[1]);
});
EXPRESSIONS.add(Ops$2.HasBlockParams, (sexp, builder) => {
    builder.hasBlockParams(sexp[1]);
});
EXPRESSIONS.add(Ops$2.ClientSideExpression, (sexp, builder) => {
    CLIENT_SIDE_EXPRS.compile(sexp, builder);
});
function compileList(params, builder) {
    if (!params) return 0;
    for (let i = 0; i < params.length; i++) {
        expr(params[i], builder);
    }
    return params.length;
}
class Blocks {
    constructor() {
        this.names = dict();
        this.funcs = [];
    }
    add(name, func) {
        this.funcs.push(func);
        this.names[name] = this.funcs.length - 1;
    }
    addMissing(func) {
        this.missing = func;
    }
    compile(name, params, hash, template, inverse, builder) {
        let index = this.names[name];
        if (index === undefined) {
            debugAssert(!!this.missing, `${name} not found, and no catch-all block handler was registered`);
            let func = this.missing;
            let handled = func(name, params, hash, template, inverse, builder);
            debugAssert(!!handled, `${name} not found, and the catch-all block handler didn't handle it`);
        } else {
            let func = this.funcs[index];
            func(params, hash, template, inverse, builder);
        }
    }
}
const BLOCKS = new Blocks();
class Inlines {
    constructor() {
        this.names = dict();
        this.funcs = [];
    }
    add(name, func) {
        this.funcs.push(func);
        this.names[name] = this.funcs.length - 1;
    }
    addMissing(func) {
        this.missing = func;
    }
    compile(sexp, builder) {
        let value = sexp[1];
        // TODO: Fix this so that expression macros can return
        // things like components, so that {{component foo}}
        // is the same as {{(component foo)}}
        if (!Array.isArray(value)) return ['expr', value];
        let name;
        let params;
        let hash;
        if (value[0] === Ops$2.Helper) {
            name = value[1];
            params = value[2];
            hash = value[3];
        } else if (value[0] === Ops$2.Unknown) {
            name = value[1];
            params = hash = null;
        } else {
            return ['expr', value];
        }
        let index = this.names[name];
        if (index === undefined && this.missing) {
            let func = this.missing;
            let returned = func(name, params, hash, builder);
            return returned === false ? ['expr', value] : returned;
        } else if (index !== undefined) {
            let func = this.funcs[index];
            let returned = func(name, params, hash, builder);
            return returned === false ? ['expr', value] : returned;
        } else {
            return ['expr', value];
        }
    }
}
const INLINES = new Inlines();
populateBuiltins(BLOCKS, INLINES);
function populateBuiltins(blocks = new Blocks(), inlines = new Inlines()) {
    blocks.add('if', (params, _hash, template, inverse, builder) => {
        //        PutArgs
        //        Test(Environment)
        //        Enter(BEGIN, END)
        // BEGIN: Noop
        //        JumpUnless(ELSE)
        //        Evaluate(default)
        //        Jump(END)
        // ELSE:  Noop
        //        Evalulate(inverse)
        // END:   Noop
        //        Exit
        if (!params || params.length !== 1) {
            throw new Error(`SYNTAX ERROR: #if requires a single argument`);
        }
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        expr(params[0], builder);
        builder.test('environment');
        builder.enter(1);
        builder.jumpUnless('ELSE');
        builder.invokeStatic(unwrap(template));
        if (inverse) {
            builder.jump('EXIT');
            builder.label('ELSE');
            builder.invokeStatic(inverse);
            builder.label('EXIT');
            builder.exit();
            builder.return();
        } else {
            builder.label('ELSE');
            builder.exit();
            builder.return();
        }
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('unless', (params, _hash, template, inverse, builder) => {
        //        PutArgs
        //        Test(Environment)
        //        Enter(BEGIN, END)
        // BEGIN: Noop
        //        JumpUnless(ELSE)
        //        Evaluate(default)
        //        Jump(END)
        // ELSE:  Noop
        //        Evalulate(inverse)
        // END:   Noop
        //        Exit
        if (!params || params.length !== 1) {
            throw new Error(`SYNTAX ERROR: #unless requires a single argument`);
        }
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        expr(params[0], builder);
        builder.test('environment');
        builder.enter(1);
        builder.jumpIf('ELSE');
        builder.invokeStatic(unwrap(template));
        if (inverse) {
            builder.jump('EXIT');
            builder.label('ELSE');
            builder.invokeStatic(inverse);
            builder.label('EXIT');
            builder.exit();
            builder.return();
        } else {
            builder.label('ELSE');
            builder.exit();
            builder.return();
        }
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('with', (params, _hash, template, inverse, builder) => {
        //        PutArgs
        //        Test(Environment)
        //        Enter(BEGIN, END)
        // BEGIN: Noop
        //        JumpUnless(ELSE)
        //        Evaluate(default)
        //        Jump(END)
        // ELSE:  Noop
        //        Evalulate(inverse)
        // END:   Noop
        //        Exit
        if (!params || params.length !== 1) {
            throw new Error(`SYNTAX ERROR: #with requires a single argument`);
        }
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        expr(params[0], builder);
        builder.dup();
        builder.test('environment');
        builder.enter(2);
        builder.jumpUnless('ELSE');
        builder.invokeStatic(unwrap(template), 1);
        if (inverse) {
            builder.jump('EXIT');
            builder.label('ELSE');
            builder.invokeStatic(inverse);
            builder.label('EXIT');
            builder.exit();
            builder.return();
        } else {
            builder.label('ELSE');
            builder.exit();
            builder.return();
        }
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('each', (params, hash, template, inverse, builder) => {
        //         Enter(BEGIN, END)
        // BEGIN:  Noop
        //         PutArgs
        //         PutIterable
        //         JumpUnless(ELSE)
        //         EnterList(BEGIN2, END2)
        // ITER:   Noop
        //         NextIter(BREAK)
        // BEGIN2: Noop
        //         PushChildScope
        //         Evaluate(default)
        //         PopScope
        // END2:   Noop
        //         Exit
        //         Jump(ITER)
        // BREAK:  Noop
        //         ExitList
        //         Jump(END)
        // ELSE:   Noop
        //         Evalulate(inverse)
        // END:    Noop
        //         Exit
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        if (hash && hash[0][0] === 'key') {
            expr(hash[1][0], builder);
        } else {
            builder.primitive(null);
        }
        expr(params[0], builder);
        builder.enter(2);
        builder.putIterator();
        builder.jumpUnless('ELSE');
        builder.pushFrame();
        builder.returnTo('ITER');
        builder.dup(Register.fp, 1);
        builder.enterList('BODY');
        builder.label('ITER');
        builder.iterate('BREAK');
        builder.label('BODY');
        builder.invokeStatic(unwrap(template), 2);
        builder.pop(2);
        builder.exit();
        builder.return();
        builder.label('BREAK');
        builder.exitList();
        builder.popFrame();
        if (inverse) {
            builder.jump('EXIT');
            builder.label('ELSE');
            builder.invokeStatic(inverse);
            builder.label('EXIT');
            builder.exit();
            builder.return();
        } else {
            builder.label('ELSE');
            builder.exit();
            builder.return();
        }
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('-in-element', (params, hash, template, _inverse, builder) => {
        if (!params || params.length !== 1) {
            throw new Error(`SYNTAX ERROR: #-in-element requires a single argument`);
        }
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        if (hash && hash[0].length) {
            let keys = hash[0],
                values = hash[1];

            if (keys.length === 1 && keys[0] === 'nextSibling') {
                expr(values[0], builder);
            } else {
                throw new Error(`SYNTAX ERROR: #-in-element does not take a \`${keys[0]}\` option`);
            }
        } else {
            expr(null, builder);
        }
        expr(params[0], builder);
        builder.dup();
        builder.test('simple');
        builder.enter(3);
        builder.jumpUnless('ELSE');
        builder.pushRemoteElement();
        builder.invokeStatic(unwrap(template));
        builder.popRemoteElement();
        builder.label('ELSE');
        builder.exit();
        builder.return();
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('-with-dynamic-vars', (_params, hash, template, _inverse, builder) => {
        if (hash) {
            let names = hash[0],
                expressions = hash[1];

            compileList(expressions, builder);
            builder.pushDynamicScope();
            builder.bindDynamicScope(names);
            builder.invokeStatic(unwrap(template));
            builder.popDynamicScope();
        } else {
            builder.invokeStatic(unwrap(template));
        }
    });
    return { blocks, inlines };
}
function compileStatement(statement, builder) {
    STATEMENTS.compile(statement, builder);
}
function compileStatements(statements, meta, env) {
    let b = new OpcodeBuilder(env, meta);
    for (let i = 0; i < statements.length; i++) {
        compileStatement(statements[i], b);
    }
    return b;
}

class CompilableTemplate {
    constructor(statements, symbolTable) {
        this.statements = statements;
        this.symbolTable = symbolTable;
        this.compiledStatic = null;
        this.compiledDynamic = null;
    }
    compileStatic(env) {
        let compiledStatic = this.compiledStatic;

        if (!compiledStatic) {
            let builder = compileStatements(this.statements, this.symbolTable.meta, env);
            builder.finalize();
            let handle = builder.start;
            compiledStatic = this.compiledStatic = new CompiledStaticTemplate(handle);
        }
        return compiledStatic;
    }
    compileDynamic(env) {
        let compiledDynamic = this.compiledDynamic;

        if (!compiledDynamic) {
            let staticBlock = this.compileStatic(env);
            compiledDynamic = new CompiledDynamicTemplate(staticBlock.handle, this.symbolTable);
        }
        return compiledDynamic;
    }
}

var Ops$$1 = Opcodes;
class Scanner {
    constructor(block, env) {
        this.block = block;
        this.env = env;
    }
    scanEntryPoint(meta) {
        let block = this.block;
        let statements = block.statements,
            symbols = block.symbols,
            hasEval = block.hasEval;

        return new CompilableTemplate(statements, { meta, symbols, hasEval });
    }
    scanBlock(meta) {
        let block = this.block;
        let statements = block.statements;

        return new CompilableTemplate(statements, { meta, parameters: EMPTY_ARRAY });
    }
    scanLayout(meta, attrs, componentName) {
        let block = this.block;
        let symbols = block.symbols,
            hasEval = block.hasEval;

        let scanner = new LayoutScanner(block, this.env, meta, attrs, componentName);
        return new CompilableTemplate(scanner.scan(), { meta, hasEval, symbols });
    }
}
class LayoutScanner {
    constructor(block, env, meta, attrs, componentName) {
        this.env = env;
        this.attrs = attrs;
        this.componentName = componentName;
        this.state = 0 /* BeforeTopLevel */;
        let statements = block.statements,
            symbols = block.symbols;

        this.statements = statements;
        this.symbols = symbols;
        this.meta = meta.templateMeta;
    }
    scan() {
        let statements = this.statements;

        this.state = 0 /* BeforeTopLevel */;
        let buffer = [];
        for (let i = 0; i < statements.length; i++) {
            this.processStatement(this.statements[i], buffer);
        }
        buffer.push([Ops$$1.ClientSideStatement, Ops$1.DidRenderLayout]);
        return buffer;
    }
    processStatement(statement, buffer) {
        switch (this.state) {
            case 0 /* BeforeTopLevel */:
                this.processBeforeTopLevel(statement, buffer);
                break;
            case 1 /* InTopLevel */:
                this.processInTopLevel(statement, buffer);
                break;
            case 2 /* AfterFlush */:
                buffer.push(statement);
                break;
            default:
                throw unreachable();
        }
    }
    processBeforeTopLevel(statement, buffer) {
        if (Statements.isComponent(statement)) {
            this.processTopLevelComponent(statement, buffer);
        } else if (Statements.isOpenElement(statement)) {
            this.processIsOpenElement(statement, buffer);
        } else {
            // Should be whitespace
            buffer.push(statement);
        }
    }
    processTopLevelComponent(statement, buffer) {
        let tagName = statement[1],
            attrs = statement[2],
            block = statement[4];

        if (this.env.hasComponentDefinition(tagName, this.meta) && tagName !== this.componentName) {
            buffer.push(statement);
            this.state = 2 /* AfterFlush */;
            return;
        }
        debugAssert(!this.env.hasComponentDefinition(tagName, this.meta) || tagName === this.componentName, `Cannot use a component (<${tagName}>) as the top-level element in the layout of <${this.componentName}>`);
        this.state = 1 /* InTopLevel */;
        buffer.push([Ops$$1.ClientSideStatement, Ops$1.SetComponentAttrs, true]);
        buffer.push([Ops$$1.ClientSideStatement, Ops$1.OpenComponentElement, tagName]);
        buffer.push([Ops$$1.ClientSideStatement, Ops$1.DidCreateElement]);
        for (let i = 0; i < attrs.length; i++) {
            this.processStatement(attrs[i], buffer);
        }
        this.processStatement([Ops$$1.FlushElement], buffer);
        if (block) {
            let statements = block.statements;

            for (let i = 0; i < statements.length; i++) {
                this.processStatement(statements[i], buffer);
            }
        }
        this.processStatement([Ops$$1.CloseElement], buffer);
    }
    processIsOpenElement(statement, buffer) {
        let tagName = statement[1];

        this.state = 1 /* InTopLevel */;
        buffer.push([Ops$$1.ClientSideStatement, Ops$1.SetComponentAttrs, true]);
        buffer.push([Ops$$1.ClientSideStatement, Ops$1.OpenComponentElement, tagName]);
        buffer.push([Ops$$1.ClientSideStatement, Ops$1.DidCreateElement]);
    }
    processInTopLevel(statement, buffer) {
        debugAssert(!Statements.isModifier(statement), `Cannot use element modifiers ({{${statement[1]} ...}}) in the top-level element in the layout of <${this.componentName}>`);
        if (Statements.isFlushElement(statement)) {
            let symbols = this.symbols,
                attrs = this.attrs;

            this.state = 2 /* AfterFlush */;
            let attrsSymbol = symbols.push(ATTRS_BLOCK);
            buffer.push(...attrs);
            buffer.push([Ops$$1.Yield, attrsSymbol, EMPTY_ARRAY]);
            buffer.push([Ops$$1.ClientSideStatement, Ops$1.SetComponentAttrs, false]);
        }
        buffer.push(statement);
    }
}

class Constants {
    constructor() {
        // `0` means NULL
        this.references = [];
        this.strings = [];
        this.expressions = [];
        this.arrays = [];
        this.blocks = [];
        this.functions = [];
        this.others = [];
    }
    getReference(value) {
        return this.references[value - 1];
    }
    reference(value) {
        let index = this.references.length;
        this.references.push(value);
        return index + 1;
    }
    getString(value) {
        return this.strings[value - 1];
    }
    string(value) {
        let index = this.strings.length;
        this.strings.push(value);
        return index + 1;
    }
    getExpression(value) {
        return this.expressions[value - 1];
    }
    getArray(value) {
        return this.arrays[value - 1];
    }
    getNames(value) {
        let _names = [];
        let names = this.getArray(value);
        for (let i = 0; i < names.length; i++) {
            let n = names[i];
            _names[i] = this.getString(n);
        }
        return _names;
    }
    array(values) {
        let index = this.arrays.length;
        this.arrays.push(values);
        return index + 1;
    }
    getBlock(value) {
        return this.blocks[value - 1];
    }
    block(block) {
        let index = this.blocks.length;
        this.blocks.push(block);
        return index + 1;
    }
    getFunction(value) {
        return this.functions[value - 1];
    }
    function(f) {
        let index = this.functions.length;
        this.functions.push(f);
        return index + 1;
    }
    getOther(value) {
        return this.others[value - 1];
    }
    other(other) {
        let index = this.others.length;
        this.others.push(other);
        return index + 1;
    }
}

const badProtocols = ['javascript:', 'vbscript:'];
const badTags = ['A', 'BODY', 'LINK', 'IMG', 'IFRAME', 'BASE', 'FORM'];
const badTagsForDataURI = ['EMBED'];
const badAttributes = ['href', 'src', 'background', 'action'];
const badAttributesForDataURI = ['src'];
function has(array, item) {
    return array.indexOf(item) !== -1;
}
function checkURI(tagName, attribute) {
    return (tagName === null || has(badTags, tagName)) && has(badAttributes, attribute);
}
function checkDataURI(tagName, attribute) {
    if (tagName === null) return false;
    return has(badTagsForDataURI, tagName) && has(badAttributesForDataURI, attribute);
}
function requiresSanitization(tagName, attribute) {
    return checkURI(tagName, attribute) || checkDataURI(tagName, attribute);
}
function sanitizeAttributeValue(env, element, attribute, value) {
    let tagName = null;
    if (value === null || value === undefined) {
        return value;
    }
    if (isSafeString(value)) {
        return value.toHTML();
    }
    if (!element) {
        tagName = null;
    } else {
        tagName = element.tagName.toUpperCase();
    }
    let str = normalizeStringValue(value);
    if (checkURI(tagName, attribute)) {
        let protocol = env.protocolForURL(str);
        if (has(badProtocols, protocol)) {
            return `unsafe:${str}`;
        }
    }
    if (checkDataURI(tagName, attribute)) {
        return `unsafe:${str}`;
    }
    return str;
}

/*
 * @method normalizeProperty
 * @param element {HTMLElement}
 * @param slotName {String}
 * @returns {Object} { name, type }
 */
function normalizeProperty(element, slotName) {
    let type, normalized;
    if (slotName in element) {
        normalized = slotName;
        type = 'prop';
    } else {
        let lower = slotName.toLowerCase();
        if (lower in element) {
            type = 'prop';
            normalized = lower;
        } else {
            type = 'attr';
            normalized = slotName;
        }
    }
    if (type === 'prop' && (normalized.toLowerCase() === 'style' || preferAttr(element.tagName, normalized))) {
        type = 'attr';
    }
    return { normalized, type };
}

// properties that MUST be set as attributes, due to:
// * browser bug
// * strange spec outlier
const ATTR_OVERRIDES = {
    // phantomjs < 2.0 lets you set it as a prop but won't reflect it
    // back to the attribute. button.getAttribute('type') === null
    BUTTON: { type: true, form: true },
    INPUT: {
        // Some version of IE (like IE9) actually throw an exception
        // if you set input.type = 'something-unknown'
        type: true,
        form: true,
        // Chrome 46.0.2464.0: 'autocorrect' in document.createElement('input') === false
        // Safari 8.0.7: 'autocorrect' in document.createElement('input') === false
        // Mobile Safari (iOS 8.4 simulator): 'autocorrect' in document.createElement('input') === true
        autocorrect: true,
        // Chrome 54.0.2840.98: 'list' in document.createElement('input') === true
        // Safari 9.1.3: 'list' in document.createElement('input') === false
        list: true
    },
    // element.form is actually a legitimate readOnly property, that is to be
    // mutated, but must be mutated by setAttribute...
    SELECT: { form: true },
    OPTION: { form: true },
    TEXTAREA: { form: true },
    LABEL: { form: true },
    FIELDSET: { form: true },
    LEGEND: { form: true },
    OBJECT: { form: true }
};
function preferAttr(tagName, propName) {
    let tag = ATTR_OVERRIDES[tagName.toUpperCase()];
    return tag && tag[propName.toLowerCase()] || false;
}

let innerHTMLWrapper = {
    colgroup: { depth: 2, before: '<table><colgroup>', after: '</colgroup></table>' },
    table: { depth: 1, before: '<table>', after: '</table>' },
    tbody: { depth: 2, before: '<table><tbody>', after: '</tbody></table>' },
    tfoot: { depth: 2, before: '<table><tfoot>', after: '</tfoot></table>' },
    thead: { depth: 2, before: '<table><thead>', after: '</thead></table>' },
    tr: { depth: 3, before: '<table><tbody><tr>', after: '</tr></tbody></table>' }
};
// Patch:    innerHTML Fix
// Browsers: IE9
// Reason:   IE9 don't allow us to set innerHTML on col, colgroup, frameset,
//           html, style, table, tbody, tfoot, thead, title, tr.
// Fix:      Wrap the innerHTML we are about to set in its parents, apply the
//           wrapped innerHTML on a div, then move the unwrapped nodes into the
//           target position.
function domChanges(document, DOMChangesClass) {
    if (!document) return DOMChangesClass;
    if (!shouldApplyFix(document)) {
        return DOMChangesClass;
    }
    let div = document.createElement('div');
    return class DOMChangesWithInnerHTMLFix extends DOMChangesClass {
        insertHTMLBefore(parent, nextSibling, html) {
            if (html === null || html === '') {
                return super.insertHTMLBefore(parent, nextSibling, html);
            }
            let parentTag = parent.tagName.toLowerCase();
            let wrapper = innerHTMLWrapper[parentTag];
            if (wrapper === undefined) {
                return super.insertHTMLBefore(parent, nextSibling, html);
            }
            return fixInnerHTML(parent, wrapper, div, html, nextSibling);
        }
    };
}
function treeConstruction(document, DOMTreeConstructionClass) {
    if (!document) return DOMTreeConstructionClass;
    if (!shouldApplyFix(document)) {
        return DOMTreeConstructionClass;
    }
    let div = document.createElement('div');
    return class DOMTreeConstructionWithInnerHTMLFix extends DOMTreeConstructionClass {
        insertHTMLBefore(parent, referenceNode, html) {
            if (html === null || html === '') {
                return super.insertHTMLBefore(parent, referenceNode, html);
            }
            let parentTag = parent.tagName.toLowerCase();
            let wrapper = innerHTMLWrapper[parentTag];
            if (wrapper === undefined) {
                return super.insertHTMLBefore(parent, referenceNode, html);
            }
            return fixInnerHTML(parent, wrapper, div, html, referenceNode);
        }
    };
}
function fixInnerHTML(parent, wrapper, div, html, reference) {
    let wrappedHtml = wrapper.before + html + wrapper.after;
    div.innerHTML = wrappedHtml;
    let parentNode = div;
    for (let i = 0; i < wrapper.depth; i++) {
        parentNode = parentNode.childNodes[0];
    }

    var _moveNodesBefore = moveNodesBefore(parentNode, parent, reference);

    let first = _moveNodesBefore[0],
        last = _moveNodesBefore[1];

    return new ConcreteBounds(parent, first, last);
}
function shouldApplyFix(document) {
    let table = document.createElement('table');
    try {
        table.innerHTML = '<tbody></tbody>';
    } catch (e) {} finally {
        if (table.childNodes.length !== 0) {
            // It worked as expected, no fix required
            return false;
        }
    }
    return true;
}

const SVG_NAMESPACE$1 = 'http://www.w3.org/2000/svg';
// Patch:    insertAdjacentHTML on SVG Fix
// Browsers: Safari, IE, Edge, Firefox ~33-34
// Reason:   insertAdjacentHTML does not exist on SVG elements in Safari. It is
//           present but throws an exception on IE and Edge. Old versions of
//           Firefox create nodes in the incorrect namespace.
// Fix:      Since IE and Edge silently fail to create SVG nodes using
//           innerHTML, and because Firefox may create nodes in the incorrect
//           namespace using innerHTML on SVG elements, an HTML-string wrapping
//           approach is used. A pre/post SVG tag is added to the string, then
//           that whole string is added to a div. The created nodes are plucked
//           out and applied to the target location on DOM.
function domChanges$1(document, DOMChangesClass, svgNamespace) {
    if (!document) return DOMChangesClass;
    if (!shouldApplyFix$1(document, svgNamespace)) {
        return DOMChangesClass;
    }
    let div = document.createElement('div');
    return class DOMChangesWithSVGInnerHTMLFix extends DOMChangesClass {
        insertHTMLBefore(parent, nextSibling, html) {
            if (html === null || html === '') {
                return super.insertHTMLBefore(parent, nextSibling, html);
            }
            if (parent.namespaceURI !== svgNamespace) {
                return super.insertHTMLBefore(parent, nextSibling, html);
            }
            return fixSVG(parent, div, html, nextSibling);
        }
    };
}
function treeConstruction$1(document, TreeConstructionClass, svgNamespace) {
    if (!document) return TreeConstructionClass;
    if (!shouldApplyFix$1(document, svgNamespace)) {
        return TreeConstructionClass;
    }
    let div = document.createElement('div');
    return class TreeConstructionWithSVGInnerHTMLFix extends TreeConstructionClass {
        insertHTMLBefore(parent, reference, html) {
            if (html === null || html === '') {
                return super.insertHTMLBefore(parent, reference, html);
            }
            if (parent.namespaceURI !== svgNamespace) {
                return super.insertHTMLBefore(parent, reference, html);
            }
            return fixSVG(parent, div, html, reference);
        }
    };
}
function fixSVG(parent, div, html, reference) {
    // IE, Edge: also do not correctly support using `innerHTML` on SVG
    // namespaced elements. So here a wrapper is used.
    let wrappedHtml = '<svg>' + html + '</svg>';
    div.innerHTML = wrappedHtml;

    var _moveNodesBefore = moveNodesBefore(div.firstChild, parent, reference);

    let first = _moveNodesBefore[0],
        last = _moveNodesBefore[1];

    return new ConcreteBounds(parent, first, last);
}
function shouldApplyFix$1(document, svgNamespace) {
    let svg = document.createElementNS(svgNamespace, 'svg');
    try {
        svg['insertAdjacentHTML']('beforeend', '<circle></circle>');
    } catch (e) {
        // IE, Edge: Will throw, insertAdjacentHTML is unsupported on SVG
        // Safari: Will throw, insertAdjacentHTML is not present on SVG
    } finally {
        // FF: Old versions will create a node in the wrong namespace
        if (svg.childNodes.length === 1 && unwrap(svg.firstChild).namespaceURI === SVG_NAMESPACE$1) {
            // The test worked as expected, no fix required
            return false;
        }
        return true;
    }
}

// Patch:    Adjacent text node merging fix
// Browsers: IE, Edge, Firefox w/o inspector open
// Reason:   These browsers will merge adjacent text nodes. For exmaple given
//           <div>Hello</div> with div.insertAdjacentHTML(' world') browsers
//           with proper behavior will populate div.childNodes with two items.
//           These browsers will populate it with one merged node instead.
// Fix:      Add these nodes to a wrapper element, then iterate the childNodes
//           of that wrapper and move the nodes to their target location. Note
//           that potential SVG bugs will have been handled before this fix.
//           Note that this fix must only apply to the previous text node, as
//           the base implementation of `insertHTMLBefore` already handles
//           following text nodes correctly.
function domChanges$2(document, DOMChangesClass) {
    if (!document) return DOMChangesClass;
    if (!shouldApplyFix$2(document)) {
        return DOMChangesClass;
    }
    return class DOMChangesWithTextNodeMergingFix extends DOMChangesClass {
        constructor(document) {
            super(document);
            this.uselessComment = document.createComment('');
        }
        insertHTMLBefore(parent, nextSibling, html) {
            if (html === null) {
                return super.insertHTMLBefore(parent, nextSibling, html);
            }
            let didSetUselessComment = false;
            let nextPrevious = nextSibling ? nextSibling.previousSibling : parent.lastChild;
            if (nextPrevious && nextPrevious instanceof Text) {
                didSetUselessComment = true;
                parent.insertBefore(this.uselessComment, nextSibling);
            }
            let bounds = super.insertHTMLBefore(parent, nextSibling, html);
            if (didSetUselessComment) {
                parent.removeChild(this.uselessComment);
            }
            return bounds;
        }
    };
}
function treeConstruction$2(document, TreeConstructionClass) {
    if (!document) return TreeConstructionClass;
    if (!shouldApplyFix$2(document)) {
        return TreeConstructionClass;
    }
    return class TreeConstructionWithTextNodeMergingFix extends TreeConstructionClass {
        constructor(document) {
            super(document);
            this.uselessComment = this.createComment('');
        }
        insertHTMLBefore(parent, reference, html) {
            if (html === null) {
                return super.insertHTMLBefore(parent, reference, html);
            }
            let didSetUselessComment = false;
            let nextPrevious = reference ? reference.previousSibling : parent.lastChild;
            if (nextPrevious && nextPrevious instanceof Text) {
                didSetUselessComment = true;
                parent.insertBefore(this.uselessComment, reference);
            }
            let bounds = super.insertHTMLBefore(parent, reference, html);
            if (didSetUselessComment) {
                parent.removeChild(this.uselessComment);
            }
            return bounds;
        }
    };
}
function shouldApplyFix$2(document) {
    let mergingTextDiv = document.createElement('div');
    mergingTextDiv.innerHTML = 'first';
    mergingTextDiv.insertAdjacentHTML('beforeend', 'second');
    if (mergingTextDiv.childNodes.length === 2) {
        // It worked as expected, no fix required
        return false;
    }
    return true;
}

const SVG_NAMESPACE$$1 = 'http://www.w3.org/2000/svg';
// http://www.w3.org/TR/html/syntax.html#html-integration-point
const SVG_INTEGRATION_POINTS = { foreignObject: 1, desc: 1, title: 1 };
// http://www.w3.org/TR/html/syntax.html#adjust-svg-attributes
// TODO: Adjust SVG attributes
// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
// TODO: Adjust SVG elements
// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
const BLACKLIST_TABLE = Object.create(null);
["b", "big", "blockquote", "body", "br", "center", "code", "dd", "div", "dl", "dt", "em", "embed", "h1", "h2", "h3", "h4", "h5", "h6", "head", "hr", "i", "img", "li", "listing", "main", "meta", "nobr", "ol", "p", "pre", "ruby", "s", "small", "span", "strong", "strike", "sub", "sup", "table", "tt", "u", "ul", "var"].forEach(tag => BLACKLIST_TABLE[tag] = 1);
let doc = typeof document === 'undefined' ? null : document;

function moveNodesBefore(source, target, nextSibling) {
    let first = source.firstChild;
    let last = null;
    let current = first;
    while (current) {
        last = current;
        current = current.nextSibling;
        target.insertBefore(last, nextSibling);
    }
    return [first, last];
}
class DOMOperations {
    constructor(document) {
        this.document = document;
        this.setupUselessElement();
    }
    // split into seperate method so that NodeDOMTreeConstruction
    // can override it.
    setupUselessElement() {
        this.uselessElement = this.document.createElement('div');
    }
    createElement(tag, context) {
        let isElementInSVGNamespace, isHTMLIntegrationPoint;
        if (context) {
            isElementInSVGNamespace = context.namespaceURI === SVG_NAMESPACE$$1 || tag === 'svg';
            isHTMLIntegrationPoint = SVG_INTEGRATION_POINTS[context.tagName];
        } else {
            isElementInSVGNamespace = tag === 'svg';
            isHTMLIntegrationPoint = false;
        }
        if (isElementInSVGNamespace && !isHTMLIntegrationPoint) {
            // FIXME: This does not properly handle <font> with color, face, or
            // size attributes, which is also disallowed by the spec. We should fix
            // this.
            if (BLACKLIST_TABLE[tag]) {
                throw new Error(`Cannot create a ${tag} inside an SVG context`);
            }
            return this.document.createElementNS(SVG_NAMESPACE$$1, tag);
        } else {
            return this.document.createElement(tag);
        }
    }
    insertBefore(parent, node, reference) {
        parent.insertBefore(node, reference);
    }
    insertHTMLBefore(_parent, nextSibling, html) {
        return insertHTMLBefore(this.uselessElement, _parent, nextSibling, html);
    }
    createTextNode(text) {
        return this.document.createTextNode(text);
    }
    createComment(data) {
        return this.document.createComment(data);
    }
}
var DOM;
(function (DOM) {
    class TreeConstruction extends DOMOperations {
        createElementNS(namespace, tag) {
            return this.document.createElementNS(namespace, tag);
        }
        setAttribute(element, name, value, namespace = null) {
            if (namespace) {
                element.setAttributeNS(namespace, name, value);
            } else {
                element.setAttribute(name, value);
            }
        }
    }
    DOM.TreeConstruction = TreeConstruction;
    let appliedTreeContruction = TreeConstruction;
    appliedTreeContruction = treeConstruction$2(doc, appliedTreeContruction);
    appliedTreeContruction = treeConstruction(doc, appliedTreeContruction);
    appliedTreeContruction = treeConstruction$1(doc, appliedTreeContruction, SVG_NAMESPACE$$1);
    DOM.DOMTreeConstruction = appliedTreeContruction;
})(DOM || (DOM = {}));
class DOMChanges extends DOMOperations {
    constructor(document) {
        super(document);
        this.document = document;
        this.namespace = null;
    }
    setAttribute(element, name, value) {
        element.setAttribute(name, value);
    }
    setAttributeNS(element, namespace, name, value) {
        element.setAttributeNS(namespace, name, value);
    }
    removeAttribute(element, name) {
        element.removeAttribute(name);
    }
    removeAttributeNS(element, namespace, name) {
        element.removeAttributeNS(namespace, name);
    }
    insertNodeBefore(parent, node, reference) {
        if (isDocumentFragment(node)) {
            let firstChild = node.firstChild,
                lastChild = node.lastChild;

            this.insertBefore(parent, node, reference);
            return new ConcreteBounds(parent, firstChild, lastChild);
        } else {
            this.insertBefore(parent, node, reference);
            return new SingleNodeBounds(parent, node);
        }
    }
    insertTextBefore(parent, nextSibling, text) {
        let textNode = this.createTextNode(text);
        this.insertBefore(parent, textNode, nextSibling);
        return textNode;
    }
    insertBefore(element, node, reference) {
        element.insertBefore(node, reference);
    }
    insertAfter(element, node, reference) {
        this.insertBefore(element, node, reference.nextSibling);
    }
}
function insertHTMLBefore(_useless, _parent, _nextSibling, html) {
    // TypeScript vendored an old version of the DOM spec where `insertAdjacentHTML`
    // only exists on `HTMLElement` but not on `Element`. We actually work with the
    // newer version of the DOM API here (and monkey-patch this method in `./compat`
    // when we detect older browsers). This is a hack to work around this limitation.
    let parent = _parent;
    let useless = _useless;
    let nextSibling = _nextSibling;
    let prev = nextSibling ? nextSibling.previousSibling : parent.lastChild;
    let last;
    if (html === null || html === '') {
        return new ConcreteBounds(parent, null, null);
    }
    if (nextSibling === null) {
        parent.insertAdjacentHTML('beforeend', html);
        last = parent.lastChild;
    } else if (nextSibling instanceof HTMLElement) {
        nextSibling.insertAdjacentHTML('beforebegin', html);
        last = nextSibling.previousSibling;
    } else {
        // Non-element nodes do not support insertAdjacentHTML, so add an
        // element and call it on that element. Then remove the element.
        //
        // This also protects Edge, IE and Firefox w/o the inspector open
        // from merging adjacent text nodes. See ./compat/text-node-merging-fix.ts
        parent.insertBefore(useless, nextSibling);
        useless.insertAdjacentHTML('beforebegin', html);
        last = useless.previousSibling;
        parent.removeChild(useless);
    }
    let first = prev ? prev.nextSibling : parent.firstChild;
    return new ConcreteBounds(parent, first, last);
}
function isDocumentFragment(node) {
    return node.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
let helper = DOMChanges;
helper = domChanges$2(doc, helper);
helper = domChanges(doc, helper);
helper = domChanges$1(doc, helper, SVG_NAMESPACE$$1);
var DOMChanges$1 = helper;
const DOMTreeConstruction = DOM.DOMTreeConstruction;

function defaultDynamicAttributes(element, attr) {
    let tagName = element.tagName,
        namespaceURI = element.namespaceURI;

    if (namespaceURI === SVG_NAMESPACE$$1) {
        return defaultDynamicAttribute(tagName, attr);
    }

    var _normalizeProperty = normalizeProperty(element, attr);

    let type = _normalizeProperty.type,
        normalized = _normalizeProperty.normalized;

    if (type === 'attr') {
        return defaultDynamicAttribute(tagName, normalized);
    } else {
        return defaultDynamicProperty(tagName, normalized);
    }
}
function defaultDynamicAttribute(tagName, name) {
    if (requiresSanitization(tagName, name)) {
        return SafeDynamicAttribute;
    } else {
        return SimpleDynamicAttribute;
    }
}
function defaultDynamicProperty(tagName, name) {
    if (requiresSanitization(tagName, name)) {
        return SafeDynamicProperty;
    }
    if (isUserInputValue(tagName, name)) {
        return InputValueDynamicAttribute;
    }
    if (isOptionSelected(tagName, name)) {
        return OptionSelectedDynamicAttribute;
    }
    return DefaultDynamicProperty;
}
class DynamicAttribute {
    constructor(attribute) {
        this.attribute = attribute;
    }
}
class SimpleDynamicAttribute extends DynamicAttribute {
    set(dom, value, _env) {
        let normalizedValue = normalizeValue(value);
        if (normalizedValue !== null) {
            var _attribute = this.attribute;
            let name = _attribute.name,
                namespace = _attribute.namespace;

            dom.__setAttribute(name, normalizedValue, namespace);
        }
    }
    update(value, _env) {
        let normalizedValue = normalizeValue(value);
        var _attribute2 = this.attribute;
        let element = _attribute2.element,
            name = _attribute2.name;

        if (normalizedValue === null) {
            element.removeAttribute(name);
        } else {
            element.setAttribute(name, normalizedValue);
        }
    }
}
class DefaultDynamicProperty extends DynamicAttribute {
    set(dom, value, _env) {
        if (value !== null && value !== undefined) {
            let name = this.attribute.name;

            dom.__setProperty(name, value);
        }
    }
    update(value, _env) {
        var _attribute3 = this.attribute;
        let element = _attribute3.element,
            name = _attribute3.name;

        element[name] = value;
        if (value === null || value === undefined) {
            this.removeAttribute();
        }
    }
    removeAttribute() {
        // TODO this sucks but to preserve properties first and to meet current
        // semantics we must do this.
        var _attribute4 = this.attribute;
        let element = _attribute4.element,
            name = _attribute4.name,
            namespace = _attribute4.namespace;

        if (namespace) {
            element.removeAttributeNS(namespace, name);
        } else {
            element.removeAttribute(name);
        }
    }
}
class SafeDynamicProperty extends DefaultDynamicProperty {
    set(dom, value, env) {
        var _attribute5 = this.attribute;
        let element = _attribute5.element,
            name = _attribute5.name;

        let sanitized = sanitizeAttributeValue(env, element, name, value);
        super.set(dom, sanitized, env);
    }
    update(value, env) {
        var _attribute6 = this.attribute;
        let element = _attribute6.element,
            name = _attribute6.name;

        let sanitized = sanitizeAttributeValue(env, element, name, value);
        super.update(sanitized, env);
    }
}
class SafeDynamicAttribute extends SimpleDynamicAttribute {
    set(dom, value, env) {
        var _attribute7 = this.attribute;
        let element = _attribute7.element,
            name = _attribute7.name;

        let sanitized = sanitizeAttributeValue(env, element, name, value);
        super.set(dom, sanitized, env);
    }
    update(value, env) {
        var _attribute8 = this.attribute;
        let element = _attribute8.element,
            name = _attribute8.name;

        let sanitized = sanitizeAttributeValue(env, element, name, value);
        super.update(sanitized, env);
    }
}
class InputValueDynamicAttribute extends DefaultDynamicProperty {
    set(dom, value) {
        dom.__setProperty('value', normalizeStringValue(value));
    }
    update(value) {
        let input = this.attribute.element;
        let currentValue = input.value;
        let normalizedValue = normalizeStringValue(value);
        if (currentValue !== normalizedValue) {
            input.value = normalizedValue;
        }
    }
}
class OptionSelectedDynamicAttribute extends DefaultDynamicProperty {
    set(dom, value) {
        if (value !== null && value !== undefined && value !== false) {
            dom.__setProperty('selected', true);
        }
    }
    update(value) {
        let option = this.attribute.element;
        if (value) {
            option.selected = true;
        } else {
            option.selected = false;
        }
    }
}
function isOptionSelected(tagName, attribute) {
    return tagName === 'OPTION' && attribute === 'selected';
}
function isUserInputValue(tagName, attribute) {
    return (tagName === 'INPUT' || tagName === 'TEXTAREA') && attribute === 'value';
}
function normalizeValue(value) {
    if (value === false || value === undefined || value === null || typeof value.toString === 'undefined') {
        return null;
    }
    if (value === true) {
        return '';
    }
    // onclick function etc in SSR
    if (typeof value === 'function') {
        return null;
    }
    return String(value);
}

class Scope {
    constructor(
    // the 0th slot is `self`
    slots, callerScope,
    // named arguments and blocks passed to a layout that uses eval
    evalScope,
    // locals in scope when the partial was invoked
    partialMap) {
        this.slots = slots;
        this.callerScope = callerScope;
        this.evalScope = evalScope;
        this.partialMap = partialMap;
    }
    static root(self, size = 0) {
        let refs = new Array(size + 1);
        for (let i = 0; i <= size; i++) {
            refs[i] = UNDEFINED_REFERENCE;
        }
        return new Scope(refs, null, null, null).init({ self });
    }
    static sized(size = 0) {
        let refs = new Array(size + 1);
        for (let i = 0; i <= size; i++) {
            refs[i] = UNDEFINED_REFERENCE;
        }
        return new Scope(refs, null, null, null);
    }
    init({ self }) {
        this.slots[0] = self;
        return this;
    }
    getSelf() {
        return this.get(0);
    }
    getSymbol(symbol) {
        return this.get(symbol);
    }
    getBlock(symbol) {
        return this.get(symbol);
    }
    getEvalScope() {
        return this.evalScope;
    }
    getPartialMap() {
        return this.partialMap;
    }
    bind(symbol, value) {
        this.set(symbol, value);
    }
    bindSelf(self) {
        this.set(0, self);
    }
    bindSymbol(symbol, value) {
        this.set(symbol, value);
    }
    bindBlock(symbol, value) {
        this.set(symbol, value);
    }
    bindEvalScope(map) {
        this.evalScope = map;
    }
    bindPartialMap(map) {
        this.partialMap = map;
    }
    bindCallerScope(scope) {
        this.callerScope = scope;
    }
    getCallerScope() {
        return this.callerScope;
    }
    child() {
        return new Scope(this.slots.slice(), this.callerScope, this.evalScope, this.partialMap);
    }
    get(index) {
        if (index >= this.slots.length) {
            throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
        }
        return this.slots[index];
    }
    set(index, value) {
        if (index >= this.slots.length) {
            throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
        }
        this.slots[index] = value;
    }
}
class Transaction {
    constructor() {
        this.scheduledInstallManagers = [];
        this.scheduledInstallModifiers = [];
        this.scheduledUpdateModifierManagers = [];
        this.scheduledUpdateModifiers = [];
        this.createdComponents = [];
        this.createdManagers = [];
        this.updatedComponents = [];
        this.updatedManagers = [];
        this.destructors = [];
    }
    didCreate(component, manager) {
        this.createdComponents.push(component);
        this.createdManagers.push(manager);
    }
    didUpdate(component, manager) {
        this.updatedComponents.push(component);
        this.updatedManagers.push(manager);
    }
    scheduleInstallModifier(modifier, manager) {
        this.scheduledInstallManagers.push(manager);
        this.scheduledInstallModifiers.push(modifier);
    }
    scheduleUpdateModifier(modifier, manager) {
        this.scheduledUpdateModifierManagers.push(manager);
        this.scheduledUpdateModifiers.push(modifier);
    }
    didDestroy(d) {
        this.destructors.push(d);
    }
    commit() {
        let createdComponents = this.createdComponents,
            createdManagers = this.createdManagers;

        for (let i = 0; i < createdComponents.length; i++) {
            let component = createdComponents[i];
            let manager = createdManagers[i];
            manager.didCreate(component);
        }
        let updatedComponents = this.updatedComponents,
            updatedManagers = this.updatedManagers;

        for (let i = 0; i < updatedComponents.length; i++) {
            let component = updatedComponents[i];
            let manager = updatedManagers[i];
            manager.didUpdate(component);
        }
        let destructors = this.destructors;

        for (let i = 0; i < destructors.length; i++) {
            destructors[i].destroy();
        }
        let scheduledInstallManagers = this.scheduledInstallManagers,
            scheduledInstallModifiers = this.scheduledInstallModifiers;

        for (let i = 0; i < scheduledInstallManagers.length; i++) {
            let manager = scheduledInstallManagers[i];
            let modifier = scheduledInstallModifiers[i];
            manager.install(modifier);
        }
        let scheduledUpdateModifierManagers = this.scheduledUpdateModifierManagers,
            scheduledUpdateModifiers = this.scheduledUpdateModifiers;

        for (let i = 0; i < scheduledUpdateModifierManagers.length; i++) {
            let manager = scheduledUpdateModifierManagers[i];
            let modifier = scheduledUpdateModifiers[i];
            manager.update(modifier);
        }
    }
}
class Opcode {
    constructor(heap) {
        this.heap = heap;
        this.offset = 0;
    }
    get type() {
        return this.heap.getbyaddr(this.offset);
    }
    get op1() {
        return this.heap.getbyaddr(this.offset + 1);
    }
    get op2() {
        return this.heap.getbyaddr(this.offset + 2);
    }
    get op3() {
        return this.heap.getbyaddr(this.offset + 3);
    }
}
var TableSlotState;
(function (TableSlotState) {
    TableSlotState[TableSlotState["Allocated"] = 0] = "Allocated";
    TableSlotState[TableSlotState["Freed"] = 1] = "Freed";
    TableSlotState[TableSlotState["Purged"] = 2] = "Purged";
    TableSlotState[TableSlotState["Pointer"] = 3] = "Pointer";
})(TableSlotState || (TableSlotState = {}));
class Heap {
    constructor() {
        this.heap = [];
        this.offset = 0;
        this.handle = 0;
        /**
         * layout:
         *
         * - pointer into heap
         * - size
         * - freed (0 or 1)
         */
        this.table = [];
    }
    push(item) {
        this.heap[this.offset++] = item;
    }
    getbyaddr(address) {
        return this.heap[address];
    }
    setbyaddr(address, value) {
        this.heap[address] = value;
    }
    malloc() {
        this.table.push(this.offset, 0, 0);
        let handle = this.handle;
        this.handle += 3;
        return handle;
    }
    finishMalloc(handle) {
        let start = this.table[handle];
        let finish = this.offset;
        this.table[handle + 1] = finish - start;
    }
    size() {
        return this.offset;
    }
    // It is illegal to close over this address, as compaction
    // may move it. However, it is legal to use this address
    // multiple times between compactions.
    getaddr(handle) {
        return this.table[handle];
    }
    gethandle(address) {
        this.table.push(address, 0, TableSlotState.Pointer);
        let handle = this.handle;
        this.handle += 3;
        return handle;
    }
    sizeof(handle) {
        return -1;
    }
    free(handle) {
        this.table[handle + 2] = 1;
    }
    compact() {
        let compactedSize = 0;
        let table = this.table,
            length = this.table.length,
            heap = this.heap;

        for (let i = 0; i < length; i += 3) {
            let offset = table[i];
            let size = table[i + 1];
            let state = table[i + 2];
            if (state === TableSlotState.Purged) {
                continue;
            } else if (state === TableSlotState.Freed) {
                // transition to "already freed"
                // a good improvement would be to reuse
                // these slots
                table[i + 2] = 2;
                compactedSize += size;
            } else if (state === TableSlotState.Allocated) {
                for (let j = offset; j <= i + size; j++) {
                    heap[j - compactedSize] = heap[j];
                }
                table[i] = offset - compactedSize;
            } else if (state === TableSlotState.Pointer) {
                table[i] = offset - compactedSize;
            }
        }
        this.offset = this.offset - compactedSize;
    }
}
class Program {
    constructor() {
        this.heap = new Heap();
        this._opcode = new Opcode(this.heap);
        this.constants = new Constants();
    }
    opcode(offset) {
        this._opcode.offset = offset;
        return this._opcode;
    }
}
class Environment {
    constructor({ appendOperations, updateOperations }) {
        this._macros = null;
        this._transaction = null;
        this.program = new Program();
        this.appendOperations = appendOperations;
        this.updateOperations = updateOperations;
    }
    toConditionalReference(reference) {
        return new ConditionalReference(reference);
    }
    getAppendOperations() {
        return this.appendOperations;
    }
    getDOM() {
        return this.updateOperations;
    }
    getIdentity(object) {
        return ensureGuid(object) + '';
    }
    begin() {
        debugAssert(!this._transaction, 'a glimmer transaction was begun, but one already exists. You may have a nested transaction');
        this._transaction = new Transaction();
    }
    get transaction() {
        return expect(this._transaction, 'must be in a transaction');
    }
    didCreate(component, manager) {
        this.transaction.didCreate(component, manager);
    }
    didUpdate(component, manager) {
        this.transaction.didUpdate(component, manager);
    }
    scheduleInstallModifier(modifier, manager) {
        this.transaction.scheduleInstallModifier(modifier, manager);
    }
    scheduleUpdateModifier(modifier, manager) {
        this.transaction.scheduleUpdateModifier(modifier, manager);
    }
    didDestroy(d) {
        this.transaction.didDestroy(d);
    }
    commit() {
        let transaction = this.transaction;
        this._transaction = null;
        transaction.commit();
    }
    attributeFor(element, attr, _isTrusting, _namespace = null) {
        return defaultDynamicAttributes(element, attr);
    }
    macros() {
        let macros = this._macros;
        if (!macros) {
            this._macros = macros = this.populateBuiltins();
        }
        return macros;
    }
    populateBuiltins() {
        return populateBuiltins();
    }
}

class UpdatingVM {
    constructor(env, { alwaysRevalidate = false }) {
        this.frameStack = new Stack();
        this.env = env;
        this.constants = env.program.constants;
        this.dom = env.getDOM();
        this.alwaysRevalidate = alwaysRevalidate;
    }
    execute(opcodes, handler) {
        let frameStack = this.frameStack;

        this.try(opcodes, handler);
        while (true) {
            if (frameStack.isEmpty()) break;
            let opcode = this.frame.nextStatement();
            if (opcode === null) {
                this.frameStack.pop();
                continue;
            }
            opcode.evaluate(this);
        }
    }
    get frame() {
        return expect(this.frameStack.current, 'bug: expected a frame');
    }
    goto(op) {
        this.frame.goto(op);
    }
    try(ops, handler) {
        this.frameStack.push(new UpdatingVMFrame(this, ops, handler));
    }
    throw() {
        this.frame.handleException();
        this.frameStack.pop();
    }
    evaluateOpcode(opcode) {
        opcode.evaluate(this);
    }
}
class BlockOpcode extends UpdatingOpcode {
    constructor(start, state, bounds$$1, children) {
        super();
        this.start = start;
        this.type = "block";
        this.next = null;
        this.prev = null;
        let env = state.env,
            scope = state.scope,
            dynamicScope = state.dynamicScope,
            stack = state.stack;

        this.children = children;
        this.env = env;
        this.scope = scope;
        this.dynamicScope = dynamicScope;
        this.stack = stack;
        this.bounds = bounds$$1;
    }
    parentElement() {
        return this.bounds.parentElement();
    }
    firstNode() {
        return this.bounds.firstNode();
    }
    lastNode() {
        return this.bounds.lastNode();
    }
    evaluate(vm) {
        vm.try(this.children, null);
    }
    destroy() {
        this.bounds.destroy();
    }
    didDestroy() {
        this.env.didDestroy(this.bounds);
    }
    toJSON() {
        let details = dict();
        details["guid"] = `${this._guid}`;
        return {
            guid: this._guid,
            type: this.type,
            details,
            children: this.children.toArray().map(op => op.toJSON())
        };
    }
}
class TryOpcode extends BlockOpcode {
    constructor(start, state, bounds$$1, children) {
        super(start, state, bounds$$1, children);
        this.type = "try";
        this.tag = this._tag = UpdatableTag.create(CONSTANT_TAG);
    }
    didInitializeChildren() {
        this._tag.inner.update(combineSlice(this.children));
    }
    evaluate(vm) {
        vm.try(this.children, this);
    }
    handleException() {
        let env = this.env,
            bounds$$1 = this.bounds,
            children = this.children,
            scope = this.scope,
            dynamicScope = this.dynamicScope,
            start = this.start,
            stack = this.stack,
            prev = this.prev,
            next = this.next;

        children.clear();
        let elementStack = NewElementBuilder.resume(env, bounds$$1, bounds$$1.reset(env));
        let vm = new VM(env, scope, dynamicScope, elementStack);
        let updating = new LinkedList();
        vm.execute(start, vm => {
            vm.stack = EvaluationStack.restore(stack);
            vm.updatingOpcodeStack.push(updating);
            vm.updateWith(this);
            vm.updatingOpcodeStack.push(children);
        });
        this.prev = prev;
        this.next = next;
    }
    toJSON() {
        let json = super.toJSON();
        let details = json["details"];
        if (!details) {
            details = json["details"] = {};
        }
        return super.toJSON();
    }
}
class ListRevalidationDelegate {
    constructor(opcode, marker) {
        this.opcode = opcode;
        this.marker = marker;
        this.didInsert = false;
        this.didDelete = false;
        this.map = opcode.map;
        this.updating = opcode['children'];
    }
    insert(key, item, memo, before) {
        let map$$1 = this.map,
            opcode = this.opcode,
            updating = this.updating;

        let nextSibling = null;
        let reference = null;
        if (before) {
            reference = map$$1[before];
            nextSibling = reference['bounds'].firstNode();
        } else {
            nextSibling = this.marker;
        }
        let vm = opcode.vmForInsertion(nextSibling);
        let tryOpcode = null;
        let start = opcode.start;

        vm.execute(start, vm => {
            map$$1[key] = tryOpcode = vm.iterate(memo, item);
            vm.updatingOpcodeStack.push(new LinkedList());
            vm.updateWith(tryOpcode);
            vm.updatingOpcodeStack.push(tryOpcode.children);
        });
        updating.insertBefore(tryOpcode, reference);
        this.didInsert = true;
    }
    retain(_key, _item, _memo) {}
    move(key, _item, _memo, before) {
        let map$$1 = this.map,
            updating = this.updating;

        let entry = map$$1[key];
        let reference = map$$1[before] || null;
        if (before) {
            move(entry, reference.firstNode());
        } else {
            move(entry, this.marker);
        }
        updating.remove(entry);
        updating.insertBefore(entry, reference);
    }
    delete(key) {
        let map$$1 = this.map;

        let opcode = map$$1[key];
        opcode.didDestroy();
        clear(opcode);
        this.updating.remove(opcode);
        delete map$$1[key];
        this.didDelete = true;
    }
    done() {
        this.opcode.didInitializeChildren(this.didInsert || this.didDelete);
    }
}
class ListBlockOpcode extends BlockOpcode {
    constructor(start, state, bounds$$1, children, artifacts) {
        super(start, state, bounds$$1, children);
        this.type = "list-block";
        this.map = dict();
        this.lastIterated = INITIAL;
        this.artifacts = artifacts;
        let _tag = this._tag = UpdatableTag.create(CONSTANT_TAG);
        this.tag = combine([artifacts.tag, _tag]);
    }
    didInitializeChildren(listDidChange = true) {
        this.lastIterated = this.artifacts.tag.value();
        if (listDidChange) {
            this._tag.inner.update(combineSlice(this.children));
        }
    }
    evaluate(vm) {
        let artifacts = this.artifacts,
            lastIterated = this.lastIterated;

        if (!artifacts.tag.validate(lastIterated)) {
            let bounds$$1 = this.bounds;
            let dom = vm.dom;

            let marker = dom.createComment('');
            dom.insertAfter(bounds$$1.parentElement(), marker, expect(bounds$$1.lastNode(), "can't insert after an empty bounds"));
            let target = new ListRevalidationDelegate(this, marker);
            let synchronizer = new IteratorSynchronizer({ target, artifacts });
            synchronizer.sync();
            this.parentElement().removeChild(marker);
        }
        // Run now-updated updating opcodes
        super.evaluate(vm);
    }
    vmForInsertion(nextSibling) {
        let env = this.env,
            scope = this.scope,
            dynamicScope = this.dynamicScope;

        let elementStack = NewElementBuilder.forInitialRender(this.env, this.bounds.parentElement(), nextSibling);
        return new VM(env, scope, dynamicScope, elementStack);
    }
    toJSON() {
        let json = super.toJSON();
        let map$$1 = this.map;
        let inner = Object.keys(map$$1).map(key => {
            return `${JSON.stringify(key)}: ${map$$1[key]._guid}`;
        }).join(", ");
        let details = json["details"];
        if (!details) {
            details = json["details"] = {};
        }
        details["map"] = `{${inner}}`;
        return json;
    }
}
class UpdatingVMFrame {
    constructor(vm, ops, exceptionHandler) {
        this.vm = vm;
        this.ops = ops;
        this.exceptionHandler = exceptionHandler;
        this.vm = vm;
        this.ops = ops;
        this.current = ops.head();
    }
    goto(op) {
        this.current = op;
    }
    nextStatement() {
        let current = this.current,
            ops = this.ops;

        if (current) this.current = ops.nextNode(current);
        return current;
    }
    handleException() {
        if (this.exceptionHandler) {
            this.exceptionHandler.handleException();
        }
    }
}

class RenderResult {
    constructor(env, updating, bounds$$1) {
        this.env = env;
        this.updating = updating;
        this.bounds = bounds$$1;
    }
    rerender({ alwaysRevalidate = false } = { alwaysRevalidate: false }) {
        let env = this.env,
            updating = this.updating;

        let vm = new UpdatingVM(env, { alwaysRevalidate });
        vm.execute(updating, this);
    }
    parentElement() {
        return this.bounds.parentElement();
    }
    firstNode() {
        return this.bounds.firstNode();
    }
    lastNode() {
        return this.bounds.lastNode();
    }
    opcodes() {
        return this.updating;
    }
    handleException() {
        throw "this should never happen";
    }
    destroy() {
        this.bounds.destroy();
        clear(this.bounds);
    }
}

class EvaluationStack {
    constructor(stack, fp, sp) {
        this.stack = stack;
        this.fp = fp;
        this.sp = sp;
        
    }
    static empty() {
        return new this([], 0, -1);
    }
    static restore(snapshot) {
        return new this(snapshot.slice(), 0, snapshot.length - 1);
    }
    isEmpty() {
        return this.sp === -1;
    }
    push(value) {
        this.stack[++this.sp] = value;
    }
    dup(position = this.sp) {
        this.push(this.stack[position]);
    }
    pop(n = 1) {
        let top = this.stack[this.sp];
        this.sp -= n;
        return top;
    }
    peek() {
        return this.stack[this.sp];
    }
    fromBase(offset) {
        return this.stack[this.fp - offset];
    }
    fromTop(offset) {
        return this.stack[this.sp - offset];
    }
    capture(items) {
        let end = this.sp + 1;
        let start = end - items;
        return this.stack.slice(start, end);
    }
    reset() {
        this.stack.length = 0;
    }
    toArray() {
        return this.stack.slice(this.fp, this.sp + 1);
    }
}
class VM {
    constructor(env, scope, dynamicScope, elementStack) {
        this.env = env;
        this.elementStack = elementStack;
        this.dynamicScopeStack = new Stack();
        this.scopeStack = new Stack();
        this.updatingOpcodeStack = new Stack();
        this.cacheGroups = new Stack();
        this.listBlockStack = new Stack();
        this.stack = EvaluationStack.empty();
        /* Registers */
        this.pc = -1;
        this.ra = -1;
        this.s0 = null;
        this.s1 = null;
        this.t0 = null;
        this.t1 = null;
        this.env = env;
        this.heap = env.program.heap;
        this.constants = env.program.constants;
        this.elementStack = elementStack;
        this.scopeStack.push(scope);
        this.dynamicScopeStack.push(dynamicScope);
    }
    get fp() {
        return this.stack.fp;
    }
    set fp(fp) {
        this.stack.fp = fp;
    }
    get sp() {
        return this.stack.sp;
    }
    set sp(sp) {
        this.stack.sp = sp;
    }
    // Fetch a value from a register onto the stack
    fetch(register) {
        this.stack.push(this[Register[register]]);
    }
    // Load a value from the stack into a register
    load(register) {
        this[Register[register]] = this.stack.pop();
    }
    // Fetch a value from a register
    fetchValue(register) {
        return this[Register[register]];
    }
    // Load a value into a register
    loadValue(register, value) {
        this[Register[register]] = value;
    }
    // Start a new frame and save $ra and $fp on the stack
    pushFrame() {
        this.stack.push(this.ra);
        this.stack.push(this.fp);
        this.fp = this.sp - 1;
    }
    // Restore $ra, $sp and $fp
    popFrame() {
        this.sp = this.fp - 1;
        this.ra = this.stack.fromBase(0);
        this.fp = this.stack.fromBase(-1);
    }
    // Jump to an address in `program`
    goto(offset) {
        this.pc = typePos(this.pc + offset);
    }
    // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)
    call(handle) {
        let pc = this.heap.getaddr(handle);
        this.ra = this.pc;
        this.pc = pc;
    }
    // Put a specific `program` address in $ra
    returnTo(offset) {
        this.ra = typePos(this.pc + offset);
    }
    // Return to the `program` address stored in $ra
    return() {
        this.pc = this.ra;
    }
    static initial(env, self, dynamicScope, elementStack, program) {
        let scope = Scope.root(self, program.symbolTable.symbols.length);
        let vm = new VM(env, scope, dynamicScope, elementStack);
        vm.pc = vm.heap.getaddr(program.handle);
        vm.updatingOpcodeStack.push(new LinkedList());
        return vm;
    }
    capture(args) {
        return {
            dynamicScope: this.dynamicScope(),
            env: this.env,
            scope: this.scope(),
            stack: this.stack.capture(args)
        };
    }
    beginCacheGroup() {
        this.cacheGroups.push(this.updating().tail());
    }
    commitCacheGroup() {
        //        JumpIfNotModified(END)
        //        (head)
        //        (....)
        //        (tail)
        //        DidModify
        // END:   Noop
        let END = new LabelOpcode("END");
        let opcodes = this.updating();
        let marker = this.cacheGroups.pop();
        let head = marker ? opcodes.nextNode(marker) : opcodes.head();
        let tail = opcodes.tail();
        let tag = combineSlice(new ListSlice(head, tail));
        let guard = new JumpIfNotModifiedOpcode(tag, END);
        opcodes.insertBefore(guard, head);
        opcodes.append(new DidModifyOpcode(guard));
        opcodes.append(END);
    }
    enter(args) {
        let updating = new LinkedList();
        let state = this.capture(args);
        let tracker = this.elements().pushUpdatableBlock();
        let tryOpcode = new TryOpcode(this.heap.gethandle(this.pc), state, tracker, updating);
        this.didEnter(tryOpcode);
    }
    iterate(memo, value) {
        let stack = this.stack;
        stack.push(value);
        stack.push(memo);
        let state = this.capture(2);
        let tracker = this.elements().pushUpdatableBlock();
        // let ip = this.ip;
        // this.ip = end + 4;
        // this.frames.push(ip);
        return new TryOpcode(this.heap.gethandle(this.pc), state, tracker, new LinkedList());
    }
    enterItem(key, opcode) {
        this.listBlock().map[key] = opcode;
        this.didEnter(opcode);
    }
    enterList(relativeStart) {
        let updating = new LinkedList();
        let state = this.capture(0);
        let tracker = this.elements().pushBlockList(updating);
        let artifacts = this.stack.peek().artifacts;
        let start = this.heap.gethandle(typePos(this.pc + relativeStart));
        let opcode = new ListBlockOpcode(start, state, tracker, updating, artifacts);
        this.listBlockStack.push(opcode);
        this.didEnter(opcode);
    }
    didEnter(opcode) {
        this.updateWith(opcode);
        this.updatingOpcodeStack.push(opcode.children);
    }
    exit() {
        this.elements().popBlock();
        this.updatingOpcodeStack.pop();
        let parent = this.updating().tail();
        parent.didInitializeChildren();
    }
    exitList() {
        this.exit();
        this.listBlockStack.pop();
    }
    updateWith(opcode) {
        this.updating().append(opcode);
    }
    listBlock() {
        return expect(this.listBlockStack.current, 'expected a list block');
    }
    updating() {
        return expect(this.updatingOpcodeStack.current, 'expected updating opcode on the updating opcode stack');
    }
    elements() {
        return this.elementStack;
    }
    scope() {
        return expect(this.scopeStack.current, 'expected scope on the scope stack');
    }
    dynamicScope() {
        return expect(this.dynamicScopeStack.current, 'expected dynamic scope on the dynamic scope stack');
    }
    pushChildScope() {
        this.scopeStack.push(this.scope().child());
    }
    pushCallerScope(childScope = false) {
        let callerScope = expect(this.scope().getCallerScope(), 'pushCallerScope is called when a caller scope is present');
        this.scopeStack.push(childScope ? callerScope.child() : callerScope);
    }
    pushDynamicScope() {
        let child = this.dynamicScope().child();
        this.dynamicScopeStack.push(child);
        return child;
    }
    pushRootScope(size, bindCaller) {
        let scope = Scope.sized(size);
        if (bindCaller) scope.bindCallerScope(this.scope());
        this.scopeStack.push(scope);
        return scope;
    }
    popScope() {
        this.scopeStack.pop();
    }
    popDynamicScope() {
        this.dynamicScopeStack.pop();
    }
    newDestroyable(d) {
        this.elements().didAddDestroyable(d);
    }
    /// SCOPE HELPERS
    getSelf() {
        return this.scope().getSelf();
    }
    referenceForSymbol(symbol) {
        return this.scope().getSymbol(symbol);
    }
    /// EXECUTION
    execute(start, initialize) {
        this.pc = this.heap.getaddr(start);
        if (initialize) initialize(this);
        let result;
        while (true) {
            result = this.next();
            if (result.done) break;
        }
        return result.value;
    }
    next() {
        let env = this.env,
            updatingOpcodeStack = this.updatingOpcodeStack,
            elementStack = this.elementStack;

        let opcode = this.nextStatement(env);
        let result;
        if (opcode !== null) {
            APPEND_OPCODES.evaluate(this, opcode, opcode.type);
            result = { done: false, value: null };
        } else {
            // Unload the stack
            this.stack.reset();
            result = {
                done: true,
                value: new RenderResult(env, expect(updatingOpcodeStack.pop(), 'there should be a final updating opcode stack'), elementStack.popBlock())
            };
        }
        return result;
    }
    nextStatement(env) {
        let pc = this.pc;

        if (pc === -1) {
            return null;
        }
        let program = env.program;
        this.pc += 4;
        return program.opcode(pc);
    }
    evaluateOpcode(opcode) {
        APPEND_OPCODES.evaluate(this, opcode, opcode.type);
    }
    bindDynamicScope(names) {
        let scope = this.dynamicScope();
        for (let i = names.length - 1; i >= 0; i--) {
            let name = this.constants.getString(names[i]);
            scope.set(name, this.stack.pop());
        }
    }
}

class TemplateIterator {
    constructor(vm) {
        this.vm = vm;
    }
    next() {
        return this.vm.next();
    }
}
let clientId = 0;
function templateFactory({ id: templateId, meta, block }) {
    let parsedBlock;
    let id = templateId || `client-${clientId++}`;
    let create = (env, envMeta) => {
        let newMeta = envMeta ? assign({}, envMeta, meta) : meta;
        if (!parsedBlock) {
            parsedBlock = JSON.parse(block);
        }
        return new ScannableTemplate(id, newMeta, env, parsedBlock);
    };
    return { id, meta, create };
}
class ScannableTemplate {
    constructor(id, meta, env, rawBlock) {
        this.id = id;
        this.meta = meta;
        this.env = env;
        this.entryPoint = null;
        this.layout = null;
        this.partial = null;
        this.block = null;
        this.scanner = new Scanner(rawBlock, env);
        this.symbols = rawBlock.symbols;
        this.hasEval = rawBlock.hasEval;
    }
    render({ self, parentNode, dynamicScope, mode }) {
        let env = this.env;

        let elementBuilder;
        switch (mode) {
            case undefined:
                elementBuilder = NewElementBuilder.forInitialRender(env, parentNode, null);
                break;
            case 'rehydrate':
                elementBuilder = RehydrateBuilder.forInitialRender(env, parentNode, null);
                break;
            case 'serialize':
                elementBuilder = SerializeBuilder.forInitialRender(env, parentNode, null);
                break;
            default:
                throw new Error('unreachable');
        }
        let compiled = this.asEntryPoint().compileDynamic(env);
        let vm = VM.initial(env, self, dynamicScope, elementBuilder, compiled);
        return new TemplateIterator(vm);
    }
    asEntryPoint() {
        if (!this.entryPoint) this.entryPoint = this.scanner.scanEntryPoint(this.compilationMeta());
        return this.entryPoint;
    }
    asLayout(componentName, attrs) {
        if (!this.layout) this.layout = this.scanner.scanLayout(this.compilationMeta(), attrs || EMPTY_ARRAY, componentName);
        return this.layout;
    }
    asPartial() {
        if (!this.partial) this.partial = this.scanner.scanEntryPoint(this.compilationMeta(true));
        return this.partial;
    }
    asBlock() {
        if (!this.block) this.block = this.scanner.scanBlock(this.compilationMeta());
        return this.block;
    }
    compilationMeta(asPartial = false) {
        return { templateMeta: this.meta, symbols: this.symbols, asPartial };
    }
}

function EMPTY_CACHE() {}

class PathReference {
    constructor(parent, property) {
        this.cache = EMPTY_CACHE;
        this.inner = null;
        this.chains = null;
        this.lastParentValue = EMPTY_CACHE;
        this._guid = 0;
        this.tag = VOLATILE_TAG;
        this.parent = parent;
        this.property = property;
    }
    value() {
        let lastParentValue = this.lastParentValue,
            property = this.property,
            inner = this.inner;

        let parentValue = this._parentValue();
        if (parentValue === null || parentValue === undefined) {
            return this.cache = undefined;
        }
        if (lastParentValue === parentValue) {
            inner = this.inner;
        } else {
            let ReferenceType = typeof parentValue === 'object' ? Meta.for(parentValue).referenceTypeFor(property) : PropertyReference;
            inner = this.inner = new ReferenceType(parentValue, property, this);
        }
        // if (typeof parentValue === 'object') {
        //   Meta.for(parentValue).addReference(property, this);
        // }
        return this.cache = inner.value();
    }
    get(prop) {
        let chains = this._getChains();
        if (prop in chains) return chains[prop];
        return chains[prop] = new PathReference(this, prop);
    }
    label() {
        return '[reference Direct]';
    }
    _getChains() {
        if (this.chains) return this.chains;
        return this.chains = dict();
    }
    _parentValue() {
        let parent = this.parent.value();
        this.lastParentValue = parent;
        return parent;
    }
}

class RootReference {
    constructor(object) {
        this.chains = dict();
        this.tag = VOLATILE_TAG;
        this.object = object;
    }
    value() {
        return this.object;
    }
    update(object) {
        this.object = object;
        // this.notify();
    }
    get(prop) {
        let chains = this.chains;
        if (prop in chains) return chains[prop];
        return chains[prop] = new PathReference(this, prop);
    }
    chainFor(prop) {
        let chains = this.chains;
        if (prop in chains) return chains[prop];
        return null;
    }
    path(string) {
        return string.split('.').reduce((ref, part) => ref.get(part), this);
    }
    referenceFromParts(parts) {
        return parts.reduce((ref, part) => ref.get(part), this);
    }
    label() {
        return '[reference Root]';
    }
}

const NOOP_DESTROY = { destroy() {} };
class ConstPath {
    constructor(parent, _property) {
        this.tag = VOLATILE_TAG;
        this.parent = parent;
    }
    chain() {
        return NOOP_DESTROY;
    }
    notify() {}
    value() {
        return this.parent[this.property];
    }
    get(prop) {
        return new ConstPath(this.parent[this.property], prop);
    }
}
class ConstRoot {
    constructor(value) {
        this.tag = VOLATILE_TAG;
        this.inner = value;
    }
    update(inner) {
        this.inner = inner;
    }
    chain() {
        return NOOP_DESTROY;
    }
    notify() {}
    value() {
        return this.inner;
    }
    referenceFromParts(_parts) {
        throw new Error("Not implemented");
    }
    chainFor(_prop) {
        throw new Error("Not implemented");
    }
    get(prop) {
        return new ConstPath(this.inner, prop);
    }
}
class ConstMeta /*implements IMeta*/ {
    constructor(object) {
        this.object = object;
    }
    root() {
        return new ConstRoot(this.object);
    }
}
const CLASS_META = "df8be4c8-4e89-44e2-a8f9-550c8dacdca7";
const hasOwnProperty = Object.hasOwnProperty;
class Meta {
    constructor(object, { RootReferenceFactory, DefaultPathReferenceFactory }) {
        this.references = null;
        this.slots = null;
        this.referenceTypes = null;
        this.propertyMetadata = null;
        this.object = object;
        this.RootReferenceFactory = RootReferenceFactory || RootReference;
        this.DefaultPathReferenceFactory = DefaultPathReferenceFactory || PropertyReference;
    }
    static for(obj) {
        if (obj === null || obj === undefined) return new Meta(obj, {});
        if (hasOwnProperty.call(obj, '_meta') && obj._meta) return obj._meta;
        if (!Object.isExtensible(obj)) return new ConstMeta(obj);
        let MetaToUse = Meta;
        if (obj.constructor && obj.constructor[CLASS_META]) {
            let classMeta = obj.constructor[CLASS_META];
            MetaToUse = classMeta.InstanceMetaConstructor;
        } else if (obj[CLASS_META]) {
            MetaToUse = obj[CLASS_META].InstanceMetaConstructor;
        }
        return obj._meta = new MetaToUse(obj, {});
    }
    static exists(obj) {
        return typeof obj === 'object' && obj._meta;
    }
    static metadataForProperty(_key) {
        return null;
    }
    addReference(property, reference) {
        let refs = this.references = this.references || dict();
        let set = refs[property] = refs[property] || new DictSet();
        set.add(reference);
    }
    addReferenceTypeFor(property, type) {
        this.referenceTypes = this.referenceTypes || dict();
        this.referenceTypes[property] = type;
    }
    referenceTypeFor(property) {
        if (!this.referenceTypes) return PropertyReference;
        return this.referenceTypes[property] || PropertyReference;
    }
    removeReference(property, reference) {
        if (!this.references) return;
        let set = this.references[property];
        set.delete(reference);
    }
    getReferenceTypes() {
        this.referenceTypes = this.referenceTypes || dict();
        return this.referenceTypes;
    }
    referencesFor(property) {
        if (!this.references) return null;
        return this.references[property];
    }
    getSlots() {
        return this.slots = this.slots || dict();
    }
    root() {
        return this.rootCache = this.rootCache || new this.RootReferenceFactory(this.object);
    }
}

class PropertyReference {
    constructor(object, property, _outer) {
        this.tag = VOLATILE_TAG;
        this.object = object;
        this.property = property;
    }
    value() {
        return this.object[this.property];
    }
    label() {
        return '[reference Property]';
    }
}

// import { metaFor } from './meta';
// import { intern } from '@glimmer/util';

function isTypeSpecifier(specifier) {
    return specifier.indexOf(':') === -1;
}
class ApplicationRegistry {
    constructor(registry, resolver) {
        this._registry = registry;
        this._resolver = resolver;
    }
    register(specifier, factory, options) {
        let normalizedSpecifier = this._toAbsoluteSpecifier(specifier);
        this._registry.register(normalizedSpecifier, factory, options);
    }
    registration(specifier) {
        let normalizedSpecifier = this._toAbsoluteSpecifier(specifier);
        return this._registry.registration(normalizedSpecifier);
    }
    unregister(specifier) {
        let normalizedSpecifier = this._toAbsoluteSpecifier(specifier);
        this._registry.unregister(normalizedSpecifier);
    }
    registerOption(specifier, option, value) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        this._registry.registerOption(normalizedSpecifier, option, value);
    }
    registeredOption(specifier, option) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        return this._registry.registeredOption(normalizedSpecifier, option);
    }
    registeredOptions(specifier) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        return this._registry.registeredOptions(normalizedSpecifier);
    }
    unregisterOption(specifier, option) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        this._registry.unregisterOption(normalizedSpecifier, option);
    }
    registerInjection(specifier, property, injection) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        let normalizedInjection = this._toAbsoluteSpecifier(injection);
        this._registry.registerInjection(normalizedSpecifier, property, normalizedInjection);
    }
    registeredInjections(specifier) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        return this._registry.registeredInjections(normalizedSpecifier);
    }
    _toAbsoluteSpecifier(specifier, referrer) {
        return this._resolver.identify(specifier, referrer);
    }
    _toAbsoluteOrTypeSpecifier(specifier) {
        if (isTypeSpecifier(specifier)) {
            return specifier;
        } else {
            return this._toAbsoluteSpecifier(specifier);
        }
    }
}

class DynamicScope {
    constructor(bucket = null) {
        if (bucket) {
            this.bucket = assign({}, bucket);
        } else {
            this.bucket = {};
        }
    }
    get(key) {
        return this.bucket[key];
    }
    set(key, reference) {
        return this.bucket[key] = reference;
    }
    child() {
        return new DynamicScope(this.bucket);
    }
}

class ArrayIterator {
    constructor(array, keyFor) {
        this.position = 0;
        this.array = array;
        this.keyFor = keyFor;
    }
    isEmpty() {
        return this.array.length === 0;
    }
    next() {
        let position = this.position,
            array = this.array,
            keyFor = this.keyFor;

        if (position >= array.length) return null;
        let value = array[position];
        let key = keyFor(value, position);
        let memo = position;
        this.position++;
        return { key, value, memo };
    }
}
class ObjectKeysIterator {
    constructor(keys, values, keyFor) {
        this.position = 0;
        this.keys = keys;
        this.values = values;
        this.keyFor = keyFor;
    }
    isEmpty() {
        return this.keys.length === 0;
    }
    next() {
        let position = this.position,
            keys = this.keys,
            values = this.values,
            keyFor = this.keyFor;

        if (position >= keys.length) return null;
        let value = values[position];
        let memo = keys[position];
        let key = keyFor(value, memo);
        this.position++;
        return { key, value, memo };
    }
}
class EmptyIterator {
    isEmpty() {
        return true;
    }
    next() {
        throw new Error(`Cannot call next() on an empty iterator`);
    }
}
const EMPTY_ITERATOR = new EmptyIterator();
class Iterable {
    constructor(ref, keyFor) {
        this.tag = ref.tag;
        this.ref = ref;
        this.keyFor = keyFor;
    }
    iterate() {
        let ref = this.ref,
            keyFor = this.keyFor;

        let iterable = ref.value();
        if (Array.isArray(iterable)) {
            return iterable.length > 0 ? new ArrayIterator(iterable, keyFor) : EMPTY_ITERATOR;
        } else if (iterable === undefined || iterable === null) {
            return EMPTY_ITERATOR;
        } else if (iterable.forEach !== undefined) {
            let array = [];
            iterable.forEach(function (item) {
                array.push(item);
            });
            return array.length > 0 ? new ArrayIterator(array, keyFor) : EMPTY_ITERATOR;
        } else if (typeof iterable === 'object') {
            let keys = Object.keys(iterable);
            return keys.length > 0 ? new ObjectKeysIterator(keys, keys.map(key => iterable[key]), keyFor) : EMPTY_ITERATOR;
        } else {
            throw new Error(`Don't know how to {{#each ${iterable}}}`);
        }
    }
    valueReferenceFor(item) {
        return new RootReference(item.value);
    }
    updateValueReference(reference, item) {
        reference.update(item.value);
    }
    memoReferenceFor(item) {
        return new RootReference(item.memo);
    }
    updateMemoReference(reference, item) {
        reference.update(item.memo);
    }
}

function blockComponentMacro(params, hash, template, inverse, builder) {
    let definitionArgs = [params.slice(0, 1), null, null, null];
    let args = [params.slice(1), hashToArgs(hash), template, inverse];
    builder.component.dynamic(definitionArgs, dynamicComponentFor, args);
    return true;
}
function inlineComponentMacro(_name, params, hash, builder) {
    let definitionArgs = [params.slice(0, 1), null, null, null];
    let args = [params.slice(1), hashToArgs(hash), null, null];
    builder.component.dynamic(definitionArgs, dynamicComponentFor, args);
    return true;
}
function dynamicComponentFor(vm, args, meta) {
    let nameRef = args.positional.at(0);
    let env = vm.env;
    return new DynamicComponentReference(nameRef, env, meta);
}
class DynamicComponentReference {
    constructor(nameRef, env, meta) {
        this.nameRef = nameRef;
        this.env = env;
        this.meta = meta;
        this.tag = nameRef.tag;
    }
    value() {
        let env = this.env,
            nameRef = this.nameRef;

        let nameOrDef = nameRef.value();
        if (typeof nameOrDef === 'string') {
            return env.getComponentDefinition(nameOrDef, this.meta);
        }
        return null;
    }
    get() {
        return UNDEFINED_REFERENCE;
    }
}
function hashToArgs(hash) {
    if (hash === null) return null;
    let names = hash[0].map(key => `@${key}`);
    return [names, hash[1]];
}

function buildAction(vm, _args) {
    let componentRef = vm.getSelf();
    let args = _args.capture();
    let actionFunc = args.positional.at(0).value();
    if (typeof actionFunc !== 'function') {
        throwNoActionError(actionFunc, args.positional.at(0));
    }
    return new ConstReference(function action(...invokedArgs) {
        let curriedArgs = args.positional.value();
        // Consume the action function that was already captured above.
        curriedArgs.shift();
        curriedArgs.push(...invokedArgs);
        // Invoke the function with the component as the context, the curried
        // arguments passed to `{{action}}`, and the arguments the bound function
        // was invoked with.
        actionFunc.apply(componentRef && componentRef.value(), curriedArgs);
    });
}
function throwNoActionError(actionFunc, actionFuncReference) {
    let referenceInfo = debugInfoForReference(actionFuncReference);
    throw new Error(`You tried to create an action with the {{action}} helper, but the first argument ${referenceInfo}was ${typeof actionFunc} instead of a function.`);
}
function debugInfoForReference(reference) {
    let message = '';
    let parent;
    let property;
    if (reference === null || reference === undefined) {
        return message;
    }
    if ('parent' in reference && 'property' in reference) {
        parent = reference['parent'].value();
        property = reference['property'];
    } else if ('_parentValue' in reference && '_propertyKey' in reference) {
        parent = reference['_parentValue'];
        property = reference['_propertyKey'];
    }
    if (property !== undefined) {
        message += `('${property}' on ${debugName(parent)}) `;
    }
    return message;
}
function debugName(obj) {
    let objType = typeof obj;
    if (obj === null || obj === undefined) {
        return objType;
    } else if (objType === 'number' || objType === 'boolean') {
        return obj.toString();
    } else {
        if (obj['debugName']) {
            return obj['debugName'];
        }
        try {
            return JSON.stringify(obj);
        } catch (e) {}
        return obj.toString();
    }
}

function buildUserHelper(helperFunc) {
    return (_vm, args) => new HelperReference(helperFunc, args);
}
class SimplePathReference {
    constructor(parent, property) {
        this.tag = VOLATILE_TAG;
        this.parent = parent;
        this.property = property;
    }
    value() {
        return this.parent.value()[this.property];
    }
    get(prop) {
        return new SimplePathReference(this, prop);
    }
}
class HelperReference {
    constructor(helper, args) {
        this.tag = VOLATILE_TAG;
        this.helper = helper;
        this.args = args.capture();
    }
    value() {
        let helper = this.helper,
            args = this.args;

        return helper(args.positional.value(), args.named.value());
    }
    get(prop) {
        return new SimplePathReference(this, prop);
    }
}

class DefaultComponentDefinition extends ComponentDefinition {
    toJSON() {
        return `<default-component-definition name=${this.name}>`;
    }
}
const DEFAULT_MANAGER = 'main';
const DEFAULT_HELPERS = {
    action: buildAction
};
class Environment$1 extends Environment {
    constructor(options) {
        super({ appendOperations: options.appendOperations, updateOperations: new DOMChanges$1(options.document || document) });
        this.helpers = dict();
        this.modifiers = dict();
        this.components = dict();
        this.managers = dict();
        setOwner(this, getOwner(options));
        // TODO - required for `protocolForURL` - seek alternative approach
        // e.g. see `installPlatformSpecificProtocolForURL` in Ember
        this.uselessAnchor = options.document.createElement('a');
    }
    static create(options = {}) {
        options.document = options.document || self.document;
        options.appendOperations = options.appendOperations || new DOMTreeConstruction(options.document);
        return new Environment$1(options);
    }
    protocolForURL(url) {
        // TODO - investigate alternative approaches
        // e.g. see `installPlatformSpecificProtocolForURL` in Ember
        this.uselessAnchor.href = url;
        return this.uselessAnchor.protocol;
    }
    hasPartial() {
        return false;
    }
    lookupPartial() {}
    managerFor(managerId = DEFAULT_MANAGER) {
        let manager;
        manager = this.managers[managerId];
        if (!manager) {
            let app = getOwner(this);
            manager = this.managers[managerId] = getOwner(this).lookup(`component-manager:/${app.rootName}/component-managers/${managerId}`);
            if (!manager) {
                throw new Error(`No component manager found for ID ${managerId}.`);
            }
        }
        return manager;
    }
    hasComponentDefinition(name, meta) {
        return !!this.identifyComponent(name, meta);
    }
    getComponentDefinition(name, meta) {
        let owner = getOwner(this);
        let specifier = unwrap(this.identifyComponent(name, meta));
        if (!this.components[specifier]) {
            return this.registerComponent(name, specifier, meta, owner);
        }
        return this.components[specifier];
    }
    registerComponent(name, templateSpecifier, meta, owner) {
        let serializedTemplate = owner.lookup('template', templateSpecifier);
        let componentSpecifier = owner.identify('component', templateSpecifier);
        let componentFactory = null;
        if (componentSpecifier) {
            componentFactory = owner.factoryFor(componentSpecifier);
        }
        let template = templateFactory(serializedTemplate).create(this);
        let manager = this.managerFor(serializedTemplate.meta.managerId);
        let definition;
        if (canCreateComponentDefinition(manager)) {
            definition = manager.createComponentDefinition(name, template, componentFactory);
        } else {
            definition = new DefaultComponentDefinition(name, manager, componentFactory);
        }
        this.components[templateSpecifier] = definition;
        return definition;
    }
    hasHelper(name, meta) {
        return !!this.lookupHelper(name, meta);
    }
    lookupHelper(name, meta) {
        if (DEFAULT_HELPERS[name]) {
            return DEFAULT_HELPERS[name];
        }
        let owner = getOwner(this);
        let relSpecifier = `helper:${name}`;
        let referrer = meta.specifier;
        let specifier = owner.identify(relSpecifier, referrer);
        if (specifier === undefined) {
            return;
        }
        if (!this.helpers[specifier]) {
            return this.registerHelper(specifier, owner);
        }
        return this.helpers[specifier];
    }
    registerHelper(specifier, owner) {
        let helperFunc = owner.lookup(specifier);
        let userHelper = buildUserHelper(helperFunc);
        this.helpers[specifier] = userHelper;
        return userHelper;
    }
    hasModifier(modifierName, blockMeta) {
        return modifierName.length === 1 && modifierName in this.modifiers;
    }
    lookupModifier(modifierName, blockMeta) {
        let modifier = this.modifiers[modifierName];
        if (!modifier) throw new Error(`Modifier for ${modifierName} not found.`);
        return modifier;
    }
    iterableFor(ref, keyPath) {
        let keyFor;
        if (!keyPath) {
            throw new Error('Must specify a key for #each');
        }
        switch (keyPath) {
            case '@index':
                keyFor = (_, index) => String(index);
                break;
            case '@primitive':
                keyFor = item => String(item);
                break;
            default:
                keyFor = item => item[keyPath];
                break;
        }
        return new Iterable(ref, keyFor);
    }
    macros() {
        let macros = super.macros();
        populateMacros(macros.blocks, macros.inlines);
        return macros;
    }
    identifyComponent(name, meta) {
        let owner = getOwner(this);
        let relSpecifier = `template:${name}`;
        let referrer = meta.specifier;
        let specifier = owner.identify(relSpecifier, referrer);
        if (specifier === undefined && owner.identify(`component:${name}`, referrer)) {
            throw new Error(`The component '${name}' is missing a template. All components must have a template. Make sure there is a template.hbs in the component directory.`);
        }
        return specifier;
    }
}
function populateMacros(blocks, inlines) {
    blocks.add('component', blockComponentMacro);
    inlines.add('component', inlineComponentMacro);
}
function canCreateComponentDefinition(manager) {
    return manager.createComponentDefinition !== undefined;
}

var mainTemplate = { "id": "UN61+JFU", "block": "{\"symbols\":[\"root\"],\"statements\":[[4,\"each\",[[19,0,[\"roots\"]]],[[\"key\"],[\"id\"]],{\"statements\":[[4,\"-in-element\",[[19,1,[\"parent\"]]],[[\"nextSibling\"],[[19,1,[\"nextSibling\"]]]],{\"statements\":[[1,[25,\"component\",[[19,1,[\"component\"]]],null],false]],\"parameters\":[]},null]],\"parameters\":[1]},null]],\"hasEval\":false}", "meta": { "specifier": "template:/-application/templates/main" } };

function NOOP() {}
class Application {
    constructor(options) {
        this._roots = [];
        this._rootsIndex = 0;
        this._initializers = [];
        this._initialized = false;
        this._rendering = false;
        this._rendered = false;
        this._scheduled = false;
        this._rerender = NOOP;
        this.rootName = options.rootName;
        this.resolver = options.resolver;
        this.document = options.document || window.document;
    }
    /** @hidden */
    registerInitializer(initializer) {
        this._initializers.push(initializer);
    }
    /** @hidden */
    initRegistry() {
        let registry = this._registry = new Registry();
        // Create ApplicationRegistry as a proxy to the underlying registry
        // that will only be available during `initialize`.
        let appRegistry = new ApplicationRegistry(this._registry, this.resolver);
        registry.register(`environment:/${this.rootName}/main/main`, Environment$1);
        registry.registerOption('helper', 'instantiate', false);
        registry.registerOption('template', 'instantiate', false);
        registry.register(`document:/${this.rootName}/main/main`, this.document);
        registry.registerOption('document', 'instantiate', false);
        registry.registerInjection('environment', 'document', `document:/${this.rootName}/main/main`);
        registry.registerInjection('component-manager', 'env', `environment:/${this.rootName}/main/main`);
        let initializers = this._initializers;
        for (let i = 0; i < initializers.length; i++) {
            initializers[i].initialize(appRegistry);
        }
        this._initialized = true;
    }
    /** @hidden */
    initContainer() {
        this._container = new Container(this._registry, this.resolver);
        // Inject `this` (the app) as the "owner" of every object instantiated
        // by its container.
        this._container.defaultInjections = specifier => {
            let hash = {};
            setOwner(hash, this);
            return hash;
        };
    }
    /** @hidden */
    initialize() {
        this.initRegistry();
        this.initContainer();
    }
    /** @hidden */
    boot() {
        this.initialize();
        this.env = this.lookup(`environment:/${this.rootName}/main/main`);
        this.render();
    }
    /** @hidden */
    render() {
        this.env.begin();
        let mainLayout = templateFactory(mainTemplate).create(this.env);
        let self = new RootReference({ roots: this._roots });
        let doc = this.document; // TODO FixReification
        let parentNode = doc.body;
        let dynamicScope = new DynamicScope();
        let templateIterator = mainLayout.render({ self, parentNode, dynamicScope });
        let result;
        do {
            result = templateIterator.next();
        } while (!result.done);
        this.env.commit();
        let renderResult = result.value;
        this._rerender = () => {
            this.env.begin();
            renderResult.rerender();
            this.env.commit();
            this._didRender();
        };
        this._didRender();
    }
    _didRender() {
        this._rendered = true;
    }
    renderComponent(component, parent, nextSibling = null) {
        this._roots.push({ id: this._rootsIndex++, component, parent, nextSibling });
        this.scheduleRerender();
    }
    scheduleRerender() {
        if (this._scheduled || !this._rendered) return;
        this._rendering = true;
        this._scheduled = true;
        requestAnimationFrame(() => {
            this._scheduled = false;
            this._rerender();
            this._rendering = false;
        });
    }
    /**
     * Owner interface implementation
     *
     * @hidden
     */
    identify(specifier, referrer) {
        return this.resolver.identify(specifier, referrer);
    }
    /** @hidden */
    factoryFor(specifier, referrer) {
        return this._container.factoryFor(this.identify(specifier, referrer));
    }
    /** @hidden */
    lookup(specifier, referrer) {
        return this._container.lookup(this.identify(specifier, referrer));
    }
}

// TODO - use symbol

function isSpecifierStringAbsolute$1(specifier) {
    var _specifier$split = specifier.split(':');

    let type = _specifier$split[0],
        path = _specifier$split[1];

    return !!(type && path && path.indexOf('/') === 0 && path.split('/').length > 3);
}
function isSpecifierObjectAbsolute$1(specifier) {
    return specifier.rootName !== undefined && specifier.collection !== undefined && specifier.name !== undefined && specifier.type !== undefined;
}
function serializeSpecifier$1(specifier) {
    let type = specifier.type;
    let path = serializeSpecifierPath$1(specifier);
    if (path) {
        return type + ':' + path;
    } else {
        return type;
    }
}
function serializeSpecifierPath$1(specifier) {
    let path = [];
    if (specifier.rootName) {
        path.push(specifier.rootName);
    }
    if (specifier.collection) {
        path.push(specifier.collection);
    }
    if (specifier.namespace) {
        path.push(specifier.namespace);
    }
    if (specifier.name) {
        path.push(specifier.name);
    }
    if (path.length > 0) {
        let fullPath = path.join('/');
        if (isSpecifierObjectAbsolute$1(specifier)) {
            fullPath = '/' + fullPath;
        }
        return fullPath;
    }
}
function deserializeSpecifier$1(specifier) {
    let obj = {};
    if (specifier.indexOf(':') > -1) {
        var _specifier$split2 = specifier.split(':');

        let type = _specifier$split2[0],
            path = _specifier$split2[1];

        obj.type = type;
        let pathSegments;
        if (path.indexOf('/') === 0) {
            pathSegments = path.substr(1).split('/');
            obj.rootName = pathSegments.shift();
            obj.collection = pathSegments.shift();
        } else {
            pathSegments = path.split('/');
        }
        if (pathSegments.length > 0) {
            obj.name = pathSegments.pop();
            if (pathSegments.length > 0) {
                obj.namespace = pathSegments.join('/');
            }
        }
    } else {
        obj.type = specifier;
    }
    return obj;
}

function assert$1(description, test) {
    if (!test) {
        throw new Error('Assertion Failed: ' + description);
    }
}

class Resolver {
    constructor(config, registry) {
        this.config = config;
        this.registry = registry;
    }
    identify(specifier, referrer) {
        if (isSpecifierStringAbsolute$1(specifier)) {
            return specifier;
        }
        let s = deserializeSpecifier$1(specifier);
        let result;
        if (referrer) {
            let r = deserializeSpecifier$1(referrer);
            if (isSpecifierObjectAbsolute$1(r)) {
                assert$1('Specifier must not include a rootName, collection, or namespace when combined with an absolute referrer', s.rootName === undefined && s.collection === undefined && s.namespace === undefined);
                // Look locally in the referrer's namespace
                s.rootName = r.rootName;
                s.collection = r.collection;
                if (s.name) {
                    s.namespace = r.namespace ? r.namespace + '/' + r.name : r.name;
                } else {
                    s.namespace = r.namespace;
                    s.name = r.name;
                }
                if (result = this._serializeAndVerify(s)) {
                    return result;
                }
                // Look for a private collection in the referrer's namespace
                let privateCollection = this._definitiveCollection(s.type);
                if (privateCollection) {
                    s.namespace += '/-' + privateCollection;
                    if (result = this._serializeAndVerify(s)) {
                        return result;
                    }
                }
                // Because local and private resolution has failed, clear all but `name` and `type`
                // to proceed with top-level resolution
                s.rootName = s.collection = s.namespace = undefined;
            } else {
                assert$1('Referrer must either be "absolute" or include a `type` to determine the associated type', r.type);
                // Look in the definitive collection for the associated type
                s.collection = this._definitiveCollection(r.type);
                assert$1(`'${r.type}' does not have a definitive collection`, s.collection);
            }
        }
        // If the collection is unspecified, use the definitive collection for the `type`
        if (!s.collection) {
            s.collection = this._definitiveCollection(s.type);
            assert$1(`'${s.type}' does not have a definitive collection`, s.collection);
        }
        if (!s.rootName) {
            // If the root name is unspecified, try the app's `rootName` first
            s.rootName = this.config.app.rootName || 'app';
            if (result = this._serializeAndVerify(s)) {
                return result;
            }
            // Then look for an addon with a matching `rootName`
            let addonDef;
            if (s.namespace) {
                addonDef = this.config.addons && this.config.addons[s.namespace];
                s.rootName = s.namespace;
                s.namespace = undefined;
            } else {
                addonDef = this.config.addons && this.config.addons[s.name];
                s.rootName = s.name;
                s.name = 'main';
            }
        }
        if (result = this._serializeAndVerify(s)) {
            return result;
        }
    }
    retrieve(specifier) {
        return this.registry.get(specifier);
    }
    resolve(specifier, referrer) {
        let id = this.identify(specifier, referrer);
        if (id) {
            return this.retrieve(id);
        }
    }
    _definitiveCollection(type) {
        let typeDef = this.config.types[type];
        assert$1(`'${type}' is not a recognized type`, typeDef);
        return typeDef.definitiveCollection;
    }
    _serializeAndVerify(specifier) {
        let serialized = serializeSpecifier$1(specifier);
        if (this.registry.has(serialized)) {
            return serialized;
        }
    }
}

class BasicRegistry {
    constructor(entries = {}) {
        this._entries = entries;
    }
    has(specifier) {
        return specifier in this._entries;
    }
    get(specifier) {
        return this._entries[specifier];
    }
}

function tracked(...dependencies) {
    let target = dependencies[0],
        key = dependencies[1],
        descriptor = dependencies[2];

    if (typeof target === "string") {
        return function (target, key, descriptor) {
            return descriptorForTrackedComputedProperty(target, key, descriptor, dependencies);
        };
    } else {
        if (descriptor) {
            return descriptorForTrackedComputedProperty(target, key, descriptor, []);
        } else {
            installTrackedProperty(target, key);
        }
    }
}
function descriptorForTrackedComputedProperty(target, key, descriptor, dependencies) {
    let meta = metaFor$1(target);
    meta.trackedProperties[key] = true;
    meta.trackedPropertyDependencies[key] = dependencies || [];
    return {
        enumerable: true,
        configurable: false,
        get: descriptor.get,
        set: function set() {
            metaFor$1(this).dirtyableTagFor(key).inner.dirty();
            descriptor.set.apply(this, arguments);
            propertyDidChange();
        }
    };
}
/**
  Installs a getter/setter for change tracking. The accessor
  acts just like a normal property, but it triggers the `propertyDidChange`
  hook when written to.

  Values are saved on the object using a "shadow key," or a symbol based on the
  tracked property name. Sets write the value to the shadow key, and gets read
  from it.
 */
function installTrackedProperty(target, key) {
    let value;
    let shadowKey = Symbol(key);
    let meta = metaFor$1(target);
    meta.trackedProperties[key] = true;
    if (target[key] !== undefined) {
        value = target[key];
    }
    Object.defineProperty(target, key, {
        configurable: true,
        get() {
            return this[shadowKey];
        },
        set(newValue) {
            metaFor$1(this).dirtyableTagFor(key).inner.dirty();
            this[shadowKey] = newValue;
            propertyDidChange();
        }
    });
}
/**
 * Stores bookkeeping information about tracked properties on the target object
 * and includes helper methods for manipulating and retrieving that data.
 *
 * Computed properties (i.e., tracked getters/setters) deserve some explanation.
 * A computed property is invalidated when either it is set, or one of its
 * dependencies is invalidated. Therefore, we store two tags for each computed
 * property:
 *
 * 1. The dirtyable tag that we invalidate when the setter is invoked.
 * 2. A union tag (tag combinator) of the dirtyable tag and all of the computed
 *    property's dependencies' tags, used by Glimmer to determine "does this
 *    computed property need to be recomputed?"
 */
class Meta$2 {
    constructor(parent) {
        this.tags = dict();
        this.computedPropertyTags = dict();
        this.trackedProperties = parent ? Object.create(parent.trackedProperties) : dict();
        this.trackedPropertyDependencies = parent ? Object.create(parent.trackedPropertyDependencies) : dict();
    }
    /**
     * The tag representing whether the given property should be recomputed. Used
     * by e.g. Glimmer VM to detect when a property should be re-rendered. Think
     * of this as the "public-facing" tag.
     *
     * For static tracked properties, this is a single DirtyableTag. For computed
     * properties, it is a combinator of the property's DirtyableTag as well as
     * all of its dependencies' tags.
     */
    tagFor(key) {
        let tag = this.tags[key];
        if (tag) {
            return tag;
        }
        let dependencies;
        if (dependencies = this.trackedPropertyDependencies[key]) {
            return this.tags[key] = combinatorForComputedProperties(this, key, dependencies);
        }
        return this.tags[key] = DirtyableTag.create();
    }
    /**
     * The tag used internally to invalidate when a tracked property is set. For
     * static properties, this is the same DirtyableTag returned from `tagFor`.
     * For computed properties, it is the DirtyableTag used as one of the tags in
     * the tag combinator of the CP and its dependencies.
    */
    dirtyableTagFor(key) {
        let dependencies = this.trackedPropertyDependencies[key];
        let tag;
        if (dependencies) {
            // The key is for a computed property.
            tag = this.computedPropertyTags[key];
            if (tag) {
                return tag;
            }
            return this.computedPropertyTags[key] = DirtyableTag.create();
        } else {
            // The key is for a static property.
            tag = this.tags[key];
            if (tag) {
                return tag;
            }
            return this.tags[key] = DirtyableTag.create();
        }
    }
}
function combinatorForComputedProperties(meta, key, dependencies) {
    // Start off with the tag for the CP's own dirty state.
    let tags = [meta.dirtyableTagFor(key)];
    // Next, add in all of the tags for its dependencies.
    if (dependencies && dependencies.length) {
        for (let i = 0; i < dependencies.length; i++) {
            tags.push(meta.tagFor(dependencies[i]));
        }
    }
    // Return a combinator across the CP's tags and its dependencies' tags.
    return combine(tags);
}
let META = Symbol("ember-object");
function metaFor$1(obj) {
    let meta = obj[META];
    if (meta && hasOwnProperty$1(obj, META)) {
        return meta;
    }
    return obj[META] = new Meta$2(meta);
}
let hOP = Object.prototype.hasOwnProperty;
function hasOwnProperty$1(obj, key) {
    return hOP.call(obj, key);
}
let propertyDidChange = function propertyDidChange() {};
function setPropertyDidChange(cb) {
    propertyDidChange = cb;
}
function hasTag(obj, key) {
    let meta = obj[META];
    if (!obj[META]) {
        return false;
    }
    if (!meta.trackedProperties[key]) {
        return false;
    }
    return true;
}
class UntrackedPropertyError extends Error {
    constructor(target, key, message) {
        super(message);
        this.target = target;
        this.key = key;
    }
    static for(obj, key) {
        return new UntrackedPropertyError(obj, key, `The property '${key}' on ${obj} was changed after being rendered. If you want to change a property used in a template after the component has rendered, mark the property as a tracked property with the @tracked decorator.`);
    }
}
function defaultErrorThrower(obj, key) {
    throw UntrackedPropertyError.for(obj, key);
}
function tagForProperty(obj, key, throwError = defaultErrorThrower) {
    if (typeof obj === "object" && obj) {
        if (true && !hasTag(obj, key)) {
            installDevModeErrorInterceptor(obj, key, throwError);
        }
        let meta = metaFor$1(obj);
        return meta.tagFor(key);
    } else {
        return CONSTANT_TAG;
    }
}
/**
 * In development mode only, we install an ad hoc setter on properties where a
 * tag is requested (i.e., it was used in a template) without being tracked. In
 * cases where the property is set, we raise an error.
 */
function installDevModeErrorInterceptor(obj, key, throwError) {
    let target = obj;
    let descriptor;
    // Find the descriptor for the current property. We may need to walk the
    // prototype chain to do so. If the property is undefined, we may never get a
    // descriptor here.
    let hasOwnDescriptor = true;
    while (target) {
        descriptor = Object.getOwnPropertyDescriptor(target, key);
        if (descriptor) {
            break;
        }
        hasOwnDescriptor = false;
        target = Object.getPrototypeOf(target);
    }
    // If possible, define a property descriptor that passes through the current
    // value on reads but throws an exception on writes.
    if (descriptor) {
        if (descriptor.configurable || !hasOwnDescriptor) {
            Object.defineProperty(obj, key, {
                configurable: descriptor.configurable,
                enumerable: descriptor.enumerable,
                get() {
                    if (descriptor.get) {
                        return descriptor.get.call(this);
                    } else {
                        return descriptor.value;
                    }
                },
                set() {
                    throwError(this, key);
                }
            });
        }
    } else {
        Object.defineProperty(obj, key, {
            set() {
                throwError(this, key);
            }
        });
    }
}

class Component {
  /**
   * Constructs a new component and assigns itself the passed properties. You
   * should not construct new components yourself. Instead, Glimmer will
   * instantiate new components automatically as it renders.
   *
   * @param options
   */
  constructor(options) {
    /**
     * The element corresponding to the top-level element of the component's template.
     * You should not try to access this property until after the component's `didInsertElement()`
     * lifecycle hook is called.
     */
    this.element = null;
    /**
     * Development-mode only name of the component, useful for debugging.
     */
    this.debugName = null;
    /** @private
     * Slot on the component to save Arguments object passed to the `args` setter.
     */
    this.__args__ = null;
    Object.assign(this, options);
  }
  /**
   * Named arguments passed to the component from its parent component.
   * They can be accessed in JavaScript via `this.args.argumentName` and in the template via `@argumentName`.
   *
   * Say you have the following component, which will have two `args`, `firstName` and `lastName`:
   *
   * ```hbs
   * <my-component @firstName="Arthur" @lastName="Dent" />
   * ```
   *
   * If you needed to calculate `fullName` by combining both of them, you would do:
   *
   * ```ts
   * didInsertElement() {
   *   console.log(`Hi, my full name is ${this.args.firstName} ${this.args.lastName}`);
   * }
   * ```
   *
   * While in the template you could do:
   *
   * ```hbs
   * <p>Welcome, {{@firstName}} {{@lastName}}!</p>
   * ```
   *
   */
  get args() {
    return this.__args__;
  }
  set args(args) {
    this.__args__ = args;
    metaFor$1(this).dirtyableTagFor("args").inner.dirty();
  }
  static create(injections) {
    return new this(injections);
  }
  /**
   * Called when the component has been inserted into the DOM.
   * Override this function to do any set up that requires an element in the document body.
   */
  didInsertElement() {}
  /**
   * Called when the component has updated and rerendered itself.
   * Called only during a rerender, not during an initial render.
   */
  didUpdate() {}
  /**
   * Called before the component has been removed from the DOM.
   */
  willDestroy() {}
  destroy() {
    this.willDestroy();
  }
  toString() {
    return `${this.debugName} component`;
  }
}

class ComponentDefinition$1 extends ComponentDefinition {
    constructor(name, manager, template, componentFactory) {
        super(name, manager, componentFactory);
        this.template = template;
        this.componentFactory = componentFactory;
    }
    toJSON() {
        return { GlimmerDebug: `<component-definition name="${this.name}">` };
    }
}

class ComponentPathReference {
    get(key) {
        return PropertyReference$1.create(this, key);
    }
}
class CachedReference$1 extends ComponentPathReference {
    constructor() {
        super(...arguments);
        this._lastRevision = null;
        this._lastValue = null;
    }
    value() {
        let tag = this.tag,
            _lastRevision = this._lastRevision,
            _lastValue = this._lastValue;

        if (!_lastRevision || !tag.validate(_lastRevision)) {
            _lastValue = this._lastValue = this.compute();
            this._lastRevision = tag.value();
        }
        return _lastValue;
    }
}
class RootReference$1 extends ConstReference {
    constructor() {
        super(...arguments);
        this.children = dict();
    }
    get(propertyKey) {
        let ref = this.children[propertyKey];
        if (!ref) {
            ref = this.children[propertyKey] = new RootPropertyReference(this.inner, propertyKey);
        }
        return ref;
    }
}
class PropertyReference$1 extends CachedReference$1 {
    static create(parentReference, propertyKey) {
        if (isConst(parentReference)) {
            return new RootPropertyReference(parentReference.value(), propertyKey);
        } else {
            return new NestedPropertyReference(parentReference, propertyKey);
        }
    }
    get(key) {
        return new NestedPropertyReference(this, key);
    }
}
function buildError(obj, key) {
    let message = `The '${key}' property on the ${obj} was changed after it had been rendered. Properties that change after being rendered must be tracked. Use the @tracked decorator to mark this as a tracked property.`;
    throw new UntrackedPropertyError(obj, key, message);
}
class RootPropertyReference extends PropertyReference$1 {
    constructor(parentValue, propertyKey) {
        super();
        this._parentValue = parentValue;
        this._propertyKey = propertyKey;
        this.tag = tagForProperty(parentValue, propertyKey, buildError);
    }
    compute() {
        return this._parentValue[this._propertyKey];
    }
}
class NestedPropertyReference extends PropertyReference$1 {
    constructor(parentReference, propertyKey) {
        super();
        let parentReferenceTag = parentReference.tag;
        let parentObjectTag = UpdatableTag.create(CONSTANT_TAG);
        this._parentReference = parentReference;
        this._parentObjectTag = parentObjectTag;
        this._propertyKey = propertyKey;
        this.tag = combine([parentReferenceTag, parentObjectTag]);
    }
    compute() {
        let _parentReference = this._parentReference,
            _parentObjectTag = this._parentObjectTag,
            _propertyKey = this._propertyKey;

        let parentValue = _parentReference.value();
        _parentObjectTag.inner.update(tagForProperty(parentValue, _propertyKey));
        if (typeof parentValue === "string" && _propertyKey === "length") {
            return parentValue.length;
        }
        if (typeof parentValue === "object" && parentValue) {
            return parentValue[_propertyKey];
        } else {
            return undefined;
        }
    }
}

class ComponentStateBucket {
    constructor(definition, args, owner) {
        let componentFactory = definition.componentFactory;
        let name = definition.name;
        this.args = args;
        let injections = {
            debugName: name,
            args: this.namedArgsSnapshot()
        };
        setOwner(injections, owner);
        this.component = componentFactory.create(injections);
    }
    get tag() {
        return this.args.tag;
    }
    namedArgsSnapshot() {
        return Object.freeze(this.args.named.value());
    }
}
class LayoutCompiler {
    constructor(name, template) {
        this.template = template;
        this.name = name;
    }
    compile(builder) {
        builder.fromLayout(this.name, this.template);
    }
}
class ComponentManager {
    static create(options) {
        return new ComponentManager(options);
    }
    constructor(options) {
        this.env = options.env;
    }
    prepareArgs(definition, args) {
        return null;
    }
    create(environment, definition, volatileArgs) {
        let owner = getOwner(this.env);
        return new ComponentStateBucket(definition, volatileArgs.capture(), owner);
    }
    createComponentDefinition(name, template, componentFactory) {
        if (!componentFactory) {
            componentFactory = {
                class: Component,
                create(injections) {
                    return this.class.create(injections);
                }
            };
        }
        return new ComponentDefinition$1(name, this, template, componentFactory);
    }
    layoutFor(definition, bucket, env) {
        let template = definition.template;
        return compileLayout(new LayoutCompiler(definition.name, template), this.env);
    }
    getSelf(bucket) {
        return new RootReference$1(bucket.component);
    }
    didCreateElement(bucket, element) {
        if (!bucket) {
            return;
        }
        bucket.component.element = element;
    }
    didRenderLayout(bucket, bounds) {}
    didCreate(bucket) {
        bucket && bucket.component.didInsertElement();
    }
    getTag({ tag }) {
        return tag;
    }
    update(bucket, scope) {}
    didUpdateLayout() {}
    didUpdate(bucket) {
        if (!bucket) {
            return;
        }
        // TODO: This should be moved to `didUpdate`, but there's currently a
        // Glimmer bug that causes it not to be called if the layout doesn't update.
        let component = bucket.component;

        component.args = bucket.namedArgsSnapshot();
        component.didUpdate();
    }
    getDestructor(bucket) {
        return bucket.component;
    }
}

class Front extends Component {}

var __ui_components_front_app_template__ = { "id": "C4VHSCkW", "block": "{\"symbols\":[],\"statements\":[[6,\"div\"],[9,\"class\",\"wrapper\"],[7],[0,\"\\n  \"],[5,\"social-medias\",[],[[],[]],{\"statements\":[],\"parameters\":[]}],[0,\"\\n  \"],[5,\"my-posts\",[],[[],[]],{\"statements\":[],\"parameters\":[]}],[0,\"\\n\"],[8],[0,\"\\n\"]],\"hasEval\":false}", "meta": { "specifier": "template:/front/components/front-app" } };

var __decorate = undefined && undefined.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }
        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }
        function step(result) {
            result.done ? resolve(result.value) : new P(function (resolve) {
                resolve(result.value);
            }).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class MyPosts extends Component {
    constructor() {
        super(arguments);
        this.posts = [];
        this.loadPosts();
    }
    loadPosts() {
        return __awaiter(this, void 0, void 0, function* () {
            let response = yield fetch('/posts');
            this.posts = yield response.json();
        });
    }
    didInsertElement() {
        $(document).ready(function () {
            $('.collapsible').collapsible();
        });
    }
    toggleOpen() {}
}
__decorate([tracked], MyPosts.prototype, "posts", void 0);

var __ui_components_my_posts_template__ = { "id": "4+raasWv", "block": "{\"symbols\":[\"p\",\"i\"],\"statements\":[[0,\"\\n\"],[6,\"div\"],[9,\"style\",\"width: 500px;\\n    float: right;\\n    padding-bottom: 50px;\"],[7],[0,\"\\n  \"],[6,\"ul\"],[9,\"class\",\"collapsible\"],[9,\"data-collapsible\",\"accordion\"],[7],[0,\"\\n\"],[4,\"each\",[[19,0,[\"posts\"]]],[[\"key\"],[\"@index\"]],{\"statements\":[[0,\"    \"],[6,\"li\"],[7],[0,\"\\n      \"],[6,\"div\"],[9,\"class\",\"collapsible-header\"],[10,\"onclick\",[25,\"action\",[[19,0,[\"toggleOpen\"]],[19,2,[]]],null],null],[7],[6,\"div\"],[7],[0,\"First\"],[8],[8],[0,\"\\n      \"],[6,\"div\"],[10,\"class\",[26,[\"collapsible-body \",[19,2,[]]]]],[7],[6,\"span\"],[7],[1,[19,1,[\"Content\"]],true],[8],[8],[0,\"\\n    \"],[8],[0,\"\\n\"]],\"parameters\":[1,2]},null],[0,\"  \"],[8],[0,\"\\n\"],[8],[0,\"\\n    \\n      \\n\\n\"]],\"hasEval\":false}", "meta": { "specifier": "template:/front/components/my-posts" } };

class SocialMedias extends Component {}

var __ui_components_social_medias_template__ = { "id": "nP+J+/MS", "block": "{\"symbols\":[],\"statements\":[[6,\"header\"],[7],[0,\"\\n   \"],[6,\"h1\"],[7],[0,\"Kyle Rose\"],[8],[0,\"\\n   \"],[6,\"img\"],[9,\"src\",\"images/face.webp\"],[9,\"alt\",\"Mountain View\"],[9,\"style\",\"width:228px;height:228px;\"],[7],[8],[0,\"\\n   \"],[6,\"p\"],[7],[0,\"I do not understand what I can not build \"],[6,\"em\"],[7],[0,\"- Richard Feynman\"],[8],[8],[0,\"\\n     \"],[6,\"a\"],[9,\"href\",\"http://github.com/anonrose\"],[7],[0,\"\\n       \"],[6,\"i\"],[9,\"class\",\"fa fa-github-alt fa-2x\"],[9,\"aria-hidden\",\"true\"],[7],[8],[0,\"\\n     \"],[8],[0,\"\\n     \"],[6,\"a\"],[9,\"href\",\"http://twitter.com/esornona\"],[7],[0,\"\\n       \"],[6,\"i\"],[9,\"class\",\"fa fa-twitter fa-2x\"],[9,\"aria-hidden\",\"true\"],[7],[8],[0,\"\\n    \"],[8],[0,\"\\n     \"],[6,\"a\"],[9,\"href\",\"mailto:esornona@gmail.com\"],[7],[0,\"\\n       \"],[6,\"i\"],[9,\"class\",\"fa fa-envelope-open fa-2x\"],[9,\"aria-hidden\",\"true\"],[7],[8],[0,\"\\n     \"],[8],[0,\"\\n\"],[8],[0,\"\\n\"]],\"hasEval\":false}", "meta": { "specifier": "template:/front/components/social-medias" } };

var moduleMap = { 'component:/front/components/front-app': Front, 'template:/front/components/front-app': __ui_components_front_app_template__, 'component:/front/components/my-posts': MyPosts, 'template:/front/components/my-posts': __ui_components_my_posts_template__, 'component:/front/components/social-medias': SocialMedias, 'template:/front/components/social-medias': __ui_components_social_medias_template__ };

var resolverConfiguration = { "app": { "name": "front", "rootName": "front" }, "types": { "application": { "definitiveCollection": "main" }, "component": { "definitiveCollection": "components" }, "component-test": { "unresolvable": true }, "helper": { "definitiveCollection": "components" }, "helper-test": { "unresolvable": true }, "renderer": { "definitiveCollection": "main" }, "template": { "definitiveCollection": "components" } }, "collections": { "main": { "types": ["application", "renderer"] }, "components": { "group": "ui", "types": ["component", "component-test", "template", "helper", "helper-test"], "defaultType": "component", "privateCollections": ["utils"] }, "styles": { "group": "ui", "unresolvable": true }, "utils": { "unresolvable": true } } };

class App extends Application {
    constructor() {
        let moduleRegistry = new BasicRegistry(moduleMap);
        let resolver = new Resolver(resolverConfiguration, moduleRegistry);
        super({
            rootName: resolverConfiguration.app.rootName,
            resolver
        });
    }
}

/*!
 * jQuery JavaScript Library v3.2.1
 * https://jquery.com/
 *
 * Includes Sizzle.js
 * https://sizzlejs.com/
 *
 * Copyright JS Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2017-03-20T18:59Z
 */
(function (global, factory) {

	"use strict";

	if (typeof module === "object" && typeof module.exports === "object") {

		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ? factory(global, true) : function (w) {
			if (!w.document) {
				throw new Error("jQuery requires a window with a document");
			}
			return factory(w);
		};
	} else {
		factory(global);
	}

	// Pass this if window is not defined yet
})(typeof window !== "undefined" ? window : undefined, function (window, noGlobal) {

	// Edge <= 12 - 13+, Firefox <=18 - 45+, IE 10 - 11, Safari 5.1 - 9+, iOS 6 - 9.1
	// throw exceptions when non-strict code (e.g., ASP.NET 4.5) accesses strict mode
	// arguments.callee.caller (trac-13335). But as of jQuery 3.0 (2016), strict mode should be common
	// enough that all such attempts are guarded in a try block.
	"use strict";

	var arr = [];

	var document = window.document;

	var getProto = Object.getPrototypeOf;

	var _slice = arr.slice;

	var concat = arr.concat;

	var push = arr.push;

	var indexOf = arr.indexOf;

	var class2type = {};

	var toString = class2type.toString;

	var hasOwn = class2type.hasOwnProperty;

	var fnToString = hasOwn.toString;

	var ObjectFunctionString = fnToString.call(Object);

	var support = {};

	function DOMEval(code, doc) {
		doc = doc || document;

		var script = doc.createElement("script");

		script.text = code;
		doc.head.appendChild(script).parentNode.removeChild(script);
	}
	/* global Symbol */
	// Defining this global in .eslintrc.json would create a danger of using the global
	// unguarded in another place, it seems safer to define global only for this module


	var version = "3.2.1",


	// Define a local copy of jQuery
	jQuery = function jQuery(selector, context) {

		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init(selector, context);
	},


	// Support: Android <=4.0 only
	// Make sure we trim BOM and NBSP
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,


	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	    rdashAlpha = /-([a-z])/g,


	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function fcamelCase(all, letter) {
		return letter.toUpperCase();
	};

	jQuery.fn = jQuery.prototype = {

		// The current version of jQuery being used
		jquery: version,

		constructor: jQuery,

		// The default length of a jQuery object is 0
		length: 0,

		toArray: function toArray() {
			return _slice.call(this);
		},

		// Get the Nth element in the matched element set OR
		// Get the whole matched element set as a clean array
		get: function get(num) {

			// Return all the elements in a clean array
			if (num == null) {
				return _slice.call(this);
			}

			// Return just the one element from the set
			return num < 0 ? this[num + this.length] : this[num];
		},

		// Take an array of elements and push it onto the stack
		// (returning the new matched element set)
		pushStack: function pushStack(elems) {

			// Build a new jQuery matched element set
			var ret = jQuery.merge(this.constructor(), elems);

			// Add the old object onto the stack (as a reference)
			ret.prevObject = this;

			// Return the newly-formed element set
			return ret;
		},

		// Execute a callback for every element in the matched set.
		each: function each(callback) {
			return jQuery.each(this, callback);
		},

		map: function map(callback) {
			return this.pushStack(jQuery.map(this, function (elem, i) {
				return callback.call(elem, i, elem);
			}));
		},

		slice: function slice() {
			return this.pushStack(_slice.apply(this, arguments));
		},

		first: function first() {
			return this.eq(0);
		},

		last: function last() {
			return this.eq(-1);
		},

		eq: function eq(i) {
			var len = this.length,
			    j = +i + (i < 0 ? len : 0);
			return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
		},

		end: function end() {
			return this.prevObject || this.constructor();
		},

		// For internal use only.
		// Behaves like an Array's method, not like a jQuery method.
		push: push,
		sort: arr.sort,
		splice: arr.splice
	};

	jQuery.extend = jQuery.fn.extend = function () {
		var options,
		    name,
		    src,
		    copy,
		    copyIsArray,
		    clone,
		    target = arguments[0] || {},
		    i = 1,
		    length = arguments.length,
		    deep = false;

		// Handle a deep copy situation
		if (typeof target === "boolean") {
			deep = target;

			// Skip the boolean and the target
			target = arguments[i] || {};
			i++;
		}

		// Handle case when target is a string or something (possible in deep copy)
		if (typeof target !== "object" && !jQuery.isFunction(target)) {
			target = {};
		}

		// Extend jQuery itself if only one argument is passed
		if (i === length) {
			target = this;
			i--;
		}

		for (; i < length; i++) {

			// Only deal with non-null/undefined values
			if ((options = arguments[i]) != null) {

				// Extend the base object
				for (name in options) {
					src = target[name];
					copy = options[name];

					// Prevent never-ending loop
					if (target === copy) {
						continue;
					}

					// Recurse if we're merging plain objects or arrays
					if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {

						if (copyIsArray) {
							copyIsArray = false;
							clone = src && Array.isArray(src) ? src : [];
						} else {
							clone = src && jQuery.isPlainObject(src) ? src : {};
						}

						// Never move original objects, clone them
						target[name] = jQuery.extend(deep, clone, copy);

						// Don't bring in undefined values
					} else if (copy !== undefined) {
						target[name] = copy;
					}
				}
			}
		}

		// Return the modified object
		return target;
	};

	jQuery.extend({

		// Unique for each copy of jQuery on the page
		expando: "jQuery" + (version + Math.random()).replace(/\D/g, ""),

		// Assume jQuery is ready without the ready module
		isReady: true,

		error: function error(msg) {
			throw new Error(msg);
		},

		noop: function noop() {},

		isFunction: function isFunction(obj) {
			return jQuery.type(obj) === "function";
		},

		isWindow: function isWindow(obj) {
			return obj != null && obj === obj.window;
		},

		isNumeric: function isNumeric(obj) {

			// As of jQuery 3.0, isNumeric is limited to
			// strings and numbers (primitives or objects)
			// that can be coerced to finite numbers (gh-2662)
			var type = jQuery.type(obj);
			return (type === "number" || type === "string") &&

			// parseFloat NaNs numeric-cast false positives ("")
			// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
			// subtraction forces infinities to NaN
			!isNaN(obj - parseFloat(obj));
		},

		isPlainObject: function isPlainObject(obj) {
			var proto, Ctor;

			// Detect obvious negatives
			// Use toString instead of jQuery.type to catch host objects
			if (!obj || toString.call(obj) !== "[object Object]") {
				return false;
			}

			proto = getProto(obj);

			// Objects with no prototype (e.g., `Object.create( null )`) are plain
			if (!proto) {
				return true;
			}

			// Objects with prototype are plain iff they were constructed by a global Object function
			Ctor = hasOwn.call(proto, "constructor") && proto.constructor;
			return typeof Ctor === "function" && fnToString.call(Ctor) === ObjectFunctionString;
		},

		isEmptyObject: function isEmptyObject(obj) {

			/* eslint-disable no-unused-vars */
			// See https://github.com/eslint/eslint/issues/6125
			var name;

			for (name in obj) {
				return false;
			}
			return true;
		},

		type: function type(obj) {
			if (obj == null) {
				return obj + "";
			}

			// Support: Android <=2.3 only (functionish RegExp)
			return typeof obj === "object" || typeof obj === "function" ? class2type[toString.call(obj)] || "object" : typeof obj;
		},

		// Evaluates a script in a global context
		globalEval: function globalEval(code) {
			DOMEval(code);
		},

		// Convert dashed to camelCase; used by the css and data modules
		// Support: IE <=9 - 11, Edge 12 - 13
		// Microsoft forgot to hump their vendor prefix (#9572)
		camelCase: function camelCase(string) {
			return string.replace(rmsPrefix, "ms-").replace(rdashAlpha, fcamelCase);
		},

		each: function each(obj, callback) {
			var length,
			    i = 0;

			if (isArrayLike(obj)) {
				length = obj.length;
				for (; i < length; i++) {
					if (callback.call(obj[i], i, obj[i]) === false) {
						break;
					}
				}
			} else {
				for (i in obj) {
					if (callback.call(obj[i], i, obj[i]) === false) {
						break;
					}
				}
			}

			return obj;
		},

		// Support: Android <=4.0 only
		trim: function trim(text) {
			return text == null ? "" : (text + "").replace(rtrim, "");
		},

		// results is for internal usage only
		makeArray: function makeArray(arr, results) {
			var ret = results || [];

			if (arr != null) {
				if (isArrayLike(Object(arr))) {
					jQuery.merge(ret, typeof arr === "string" ? [arr] : arr);
				} else {
					push.call(ret, arr);
				}
			}

			return ret;
		},

		inArray: function inArray(elem, arr, i) {
			return arr == null ? -1 : indexOf.call(arr, elem, i);
		},

		// Support: Android <=4.0 only, PhantomJS 1 only
		// push.apply(_, arraylike) throws on ancient WebKit
		merge: function merge(first, second) {
			var len = +second.length,
			    j = 0,
			    i = first.length;

			for (; j < len; j++) {
				first[i++] = second[j];
			}

			first.length = i;

			return first;
		},

		grep: function grep(elems, callback, invert) {
			var callbackInverse,
			    matches = [],
			    i = 0,
			    length = elems.length,
			    callbackExpect = !invert;

			// Go through the array, only saving the items
			// that pass the validator function
			for (; i < length; i++) {
				callbackInverse = !callback(elems[i], i);
				if (callbackInverse !== callbackExpect) {
					matches.push(elems[i]);
				}
			}

			return matches;
		},

		// arg is for internal usage only
		map: function map(elems, callback, arg) {
			var length,
			    value,
			    i = 0,
			    ret = [];

			// Go through the array, translating each of the items to their new values
			if (isArrayLike(elems)) {
				length = elems.length;
				for (; i < length; i++) {
					value = callback(elems[i], i, arg);

					if (value != null) {
						ret.push(value);
					}
				}

				// Go through every key on the object,
			} else {
				for (i in elems) {
					value = callback(elems[i], i, arg);

					if (value != null) {
						ret.push(value);
					}
				}
			}

			// Flatten any nested arrays
			return concat.apply([], ret);
		},

		// A global GUID counter for objects
		guid: 1,

		// Bind a function to a context, optionally partially applying any
		// arguments.
		proxy: function proxy(fn, context) {
			var tmp, args, proxy;

			if (typeof context === "string") {
				tmp = fn[context];
				context = fn;
				fn = tmp;
			}

			// Quick check to determine if target is callable, in the spec
			// this throws a TypeError, but we will just return undefined.
			if (!jQuery.isFunction(fn)) {
				return undefined;
			}

			// Simulated bind
			args = _slice.call(arguments, 2);
			proxy = function proxy() {
				return fn.apply(context || this, args.concat(_slice.call(arguments)));
			};

			// Set the guid of unique handler to the same of original handler, so it can be removed
			proxy.guid = fn.guid = fn.guid || jQuery.guid++;

			return proxy;
		},

		now: Date.now,

		// jQuery.support is not used in Core but other projects attach their
		// properties to it so it needs to exist.
		support: support
	});

	if (typeof Symbol === "function") {
		jQuery.fn[Symbol.iterator] = arr[Symbol.iterator];
	}

	// Populate the class2type map
	jQuery.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "), function (i, name) {
		class2type["[object " + name + "]"] = name.toLowerCase();
	});

	function isArrayLike(obj) {

		// Support: real iOS 8.2 only (not reproducible in simulator)
		// `in` check used to prevent JIT error (gh-2145)
		// hasOwn isn't used here due to false negatives
		// regarding Nodelist length in IE
		var length = !!obj && "length" in obj && obj.length,
		    type = jQuery.type(obj);

		if (type === "function" || jQuery.isWindow(obj)) {
			return false;
		}

		return type === "array" || length === 0 || typeof length === "number" && length > 0 && length - 1 in obj;
	}
	var Sizzle =
	/*!
  * Sizzle CSS Selector Engine v2.3.3
  * https://sizzlejs.com/
  *
  * Copyright jQuery Foundation and other contributors
  * Released under the MIT license
  * http://jquery.org/license
  *
  * Date: 2016-08-08
  */
	function (window) {

		var i,
		    support,
		    Expr,
		    getText,
		    isXML,
		    tokenize,
		    compile,
		    select,
		    outermostContext,
		    sortInput,
		    hasDuplicate,


		// Local document vars
		setDocument,
		    document,
		    docElem,
		    documentIsHTML,
		    rbuggyQSA,
		    rbuggyMatches,
		    matches,
		    contains,


		// Instance-specific data
		expando = "sizzle" + 1 * new Date(),
		    preferredDoc = window.document,
		    dirruns = 0,
		    done = 0,
		    classCache = createCache(),
		    tokenCache = createCache(),
		    compilerCache = createCache(),
		    sortOrder = function sortOrder(a, b) {
			if (a === b) {
				hasDuplicate = true;
			}
			return 0;
		},


		// Instance methods
		hasOwn = {}.hasOwnProperty,
		    arr = [],
		    pop = arr.pop,
		    push_native = arr.push,
		    push = arr.push,
		    slice = arr.slice,

		// Use a stripped-down indexOf as it's faster than native
		// https://jsperf.com/thor-indexof-vs-for/5
		indexOf = function indexOf(list, elem) {
			var i = 0,
			    len = list.length;
			for (; i < len; i++) {
				if (list[i] === elem) {
					return i;
				}
			}
			return -1;
		},
		    booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",


		// Regular expressions

		// http://www.w3.org/TR/css3-selectors/#whitespace
		whitespace = "[\\x20\\t\\r\\n\\f]",


		// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
		identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",


		// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
		attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace + "*\\]",
		    pseudos = ":(" + identifier + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" + ")\\)|)",


		// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
		rwhitespace = new RegExp(whitespace + "+", "g"),
		    rtrim = new RegExp("^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g"),
		    rcomma = new RegExp("^" + whitespace + "*," + whitespace + "*"),
		    rcombinators = new RegExp("^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*"),
		    rattributeQuotes = new RegExp("=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g"),
		    rpseudo = new RegExp(pseudos),
		    ridentifier = new RegExp("^" + identifier + "$"),
		    matchExpr = {
			"ID": new RegExp("^#(" + identifier + ")"),
			"CLASS": new RegExp("^\\.(" + identifier + ")"),
			"TAG": new RegExp("^(" + identifier + "|[*])"),
			"ATTR": new RegExp("^" + attributes),
			"PSEUDO": new RegExp("^" + pseudos),
			"CHILD": new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i"),
			"bool": new RegExp("^(?:" + booleans + ")$", "i"),
			// For use in libraries implementing .is()
			// We use this for POS matching in `select`
			"needsContext": new RegExp("^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i")
		},
		    rinputs = /^(?:input|select|textarea|button)$/i,
		    rheader = /^h\d$/i,
		    rnative = /^[^{]+\{\s*\[native \w/,


		// Easily-parseable/retrievable ID or TAG or CLASS selectors
		rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,
		    rsibling = /[+~]/,


		// CSS escapes
		// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
		runescape = new RegExp("\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig"),
		    funescape = function funescape(_, escaped, escapedWhitespace) {
			var high = "0x" + escaped - 0x10000;
			// NaN means non-codepoint
			// Support: Firefox<24
			// Workaround erroneous numeric interpretation of +"0x"
			return high !== high || escapedWhitespace ? escaped : high < 0 ?
			// BMP codepoint
			String.fromCharCode(high + 0x10000) :
			// Supplemental Plane codepoint (surrogate pair)
			String.fromCharCode(high >> 10 | 0xD800, high & 0x3FF | 0xDC00);
		},


		// CSS string/identifier serialization
		// https://drafts.csswg.org/cssom/#common-serializing-idioms
		rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
		    fcssescape = function fcssescape(ch, asCodePoint) {
			if (asCodePoint) {

				// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
				if (ch === "\0") {
					return "\uFFFD";
				}

				// Control characters and (dependent upon position) numbers get escaped as code points
				return ch.slice(0, -1) + "\\" + ch.charCodeAt(ch.length - 1).toString(16) + " ";
			}

			// Other potentially-special ASCII characters get backslash-escaped
			return "\\" + ch;
		},


		// Used for iframes
		// See setDocument()
		// Removing the function wrapper causes a "Permission Denied"
		// error in IE
		unloadHandler = function unloadHandler() {
			setDocument();
		},
		    disabledAncestor = addCombinator(function (elem) {
			return elem.disabled === true && ("form" in elem || "label" in elem);
		}, { dir: "parentNode", next: "legend" });

		// Optimize for push.apply( _, NodeList )
		try {
			push.apply(arr = slice.call(preferredDoc.childNodes), preferredDoc.childNodes);
			// Support: Android<4.0
			// Detect silently failing push.apply
			arr[preferredDoc.childNodes.length].nodeType;
		} catch (e) {
			push = { apply: arr.length ?

				// Leverage slice if possible
				function (target, els) {
					push_native.apply(target, slice.call(els));
				} :

				// Support: IE<9
				// Otherwise append directly
				function (target, els) {
					var j = target.length,
					    i = 0;
					// Can't trust NodeList.length
					while (target[j++] = els[i++]) {}
					target.length = j - 1;
				}
			};
		}

		function Sizzle(selector, context, results, seed) {
			var m,
			    i,
			    elem,
			    nid,
			    match,
			    groups,
			    newSelector,
			    newContext = context && context.ownerDocument,


			// nodeType defaults to 9, since context defaults to document
			nodeType = context ? context.nodeType : 9;

			results = results || [];

			// Return early from calls with invalid selector or context
			if (typeof selector !== "string" || !selector || nodeType !== 1 && nodeType !== 9 && nodeType !== 11) {

				return results;
			}

			// Try to shortcut find operations (as opposed to filters) in HTML documents
			if (!seed) {

				if ((context ? context.ownerDocument || context : preferredDoc) !== document) {
					setDocument(context);
				}
				context = context || document;

				if (documentIsHTML) {

					// If the selector is sufficiently simple, try using a "get*By*" DOM method
					// (excepting DocumentFragment context, where the methods don't exist)
					if (nodeType !== 11 && (match = rquickExpr.exec(selector))) {

						// ID selector
						if (m = match[1]) {

							// Document context
							if (nodeType === 9) {
								if (elem = context.getElementById(m)) {

									// Support: IE, Opera, Webkit
									// TODO: identify versions
									// getElementById can match elements by name instead of ID
									if (elem.id === m) {
										results.push(elem);
										return results;
									}
								} else {
									return results;
								}

								// Element context
							} else {

								// Support: IE, Opera, Webkit
								// TODO: identify versions
								// getElementById can match elements by name instead of ID
								if (newContext && (elem = newContext.getElementById(m)) && contains(context, elem) && elem.id === m) {

									results.push(elem);
									return results;
								}
							}

							// Type selector
						} else if (match[2]) {
							push.apply(results, context.getElementsByTagName(selector));
							return results;

							// Class selector
						} else if ((m = match[3]) && support.getElementsByClassName && context.getElementsByClassName) {

							push.apply(results, context.getElementsByClassName(m));
							return results;
						}
					}

					// Take advantage of querySelectorAll
					if (support.qsa && !compilerCache[selector + " "] && (!rbuggyQSA || !rbuggyQSA.test(selector))) {

						if (nodeType !== 1) {
							newContext = context;
							newSelector = selector;

							// qSA looks outside Element context, which is not what we want
							// Thanks to Andrew Dupont for this workaround technique
							// Support: IE <=8
							// Exclude object elements
						} else if (context.nodeName.toLowerCase() !== "object") {

							// Capture the context ID, setting it first if necessary
							if (nid = context.getAttribute("id")) {
								nid = nid.replace(rcssescape, fcssescape);
							} else {
								context.setAttribute("id", nid = expando);
							}

							// Prefix every selector in the list
							groups = tokenize(selector);
							i = groups.length;
							while (i--) {
								groups[i] = "#" + nid + " " + toSelector(groups[i]);
							}
							newSelector = groups.join(",");

							// Expand context for sibling selectors
							newContext = rsibling.test(selector) && testContext(context.parentNode) || context;
						}

						if (newSelector) {
							try {
								push.apply(results, newContext.querySelectorAll(newSelector));
								return results;
							} catch (qsaError) {} finally {
								if (nid === expando) {
									context.removeAttribute("id");
								}
							}
						}
					}
				}
			}

			// All others
			return select(selector.replace(rtrim, "$1"), context, results, seed);
		}

		/**
   * Create key-value caches of limited size
   * @returns {function(string, object)} Returns the Object data after storing it on itself with
   *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
   *	deleting the oldest entry
   */
		function createCache() {
			var keys = [];

			function cache(key, value) {
				// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
				if (keys.push(key + " ") > Expr.cacheLength) {
					// Only keep the most recent entries
					delete cache[keys.shift()];
				}
				return cache[key + " "] = value;
			}
			return cache;
		}

		/**
   * Mark a function for special use by Sizzle
   * @param {Function} fn The function to mark
   */
		function markFunction(fn) {
			fn[expando] = true;
			return fn;
		}

		/**
   * Support testing using an element
   * @param {Function} fn Passed the created element and returns a boolean result
   */
		function assert(fn) {
			var el = document.createElement("fieldset");

			try {
				return !!fn(el);
			} catch (e) {
				return false;
			} finally {
				// Remove from its parent by default
				if (el.parentNode) {
					el.parentNode.removeChild(el);
				}
				// release memory in IE
				el = null;
			}
		}

		/**
   * Adds the same handler for all of the specified attrs
   * @param {String} attrs Pipe-separated list of attributes
   * @param {Function} handler The method that will be applied
   */
		function addHandle(attrs, handler) {
			var arr = attrs.split("|"),
			    i = arr.length;

			while (i--) {
				Expr.attrHandle[arr[i]] = handler;
			}
		}

		/**
   * Checks document order of two siblings
   * @param {Element} a
   * @param {Element} b
   * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
   */
		function siblingCheck(a, b) {
			var cur = b && a,
			    diff = cur && a.nodeType === 1 && b.nodeType === 1 && a.sourceIndex - b.sourceIndex;

			// Use IE sourceIndex if available on both nodes
			if (diff) {
				return diff;
			}

			// Check if b follows a
			if (cur) {
				while (cur = cur.nextSibling) {
					if (cur === b) {
						return -1;
					}
				}
			}

			return a ? 1 : -1;
		}

		/**
   * Returns a function to use in pseudos for input types
   * @param {String} type
   */
		function createInputPseudo(type) {
			return function (elem) {
				var name = elem.nodeName.toLowerCase();
				return name === "input" && elem.type === type;
			};
		}

		/**
   * Returns a function to use in pseudos for buttons
   * @param {String} type
   */
		function createButtonPseudo(type) {
			return function (elem) {
				var name = elem.nodeName.toLowerCase();
				return (name === "input" || name === "button") && elem.type === type;
			};
		}

		/**
   * Returns a function to use in pseudos for :enabled/:disabled
   * @param {Boolean} disabled true for :disabled; false for :enabled
   */
		function createDisabledPseudo(disabled) {

			// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
			return function (elem) {

				// Only certain elements can match :enabled or :disabled
				// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
				// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
				if ("form" in elem) {

					// Check for inherited disabledness on relevant non-disabled elements:
					// * listed form-associated elements in a disabled fieldset
					//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
					//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
					// * option elements in a disabled optgroup
					//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
					// All such elements have a "form" property.
					if (elem.parentNode && elem.disabled === false) {

						// Option elements defer to a parent optgroup if present
						if ("label" in elem) {
							if ("label" in elem.parentNode) {
								return elem.parentNode.disabled === disabled;
							} else {
								return elem.disabled === disabled;
							}
						}

						// Support: IE 6 - 11
						// Use the isDisabled shortcut property to check for disabled fieldset ancestors
						return elem.isDisabled === disabled ||

						// Where there is no isDisabled, check manually
						/* jshint -W018 */
						elem.isDisabled !== !disabled && disabledAncestor(elem) === disabled;
					}

					return elem.disabled === disabled;

					// Try to winnow out elements that can't be disabled before trusting the disabled property.
					// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
					// even exist on them, let alone have a boolean value.
				} else if ("label" in elem) {
					return elem.disabled === disabled;
				}

				// Remaining elements are neither :enabled nor :disabled
				return false;
			};
		}

		/**
   * Returns a function to use in pseudos for positionals
   * @param {Function} fn
   */
		function createPositionalPseudo(fn) {
			return markFunction(function (argument) {
				argument = +argument;
				return markFunction(function (seed, matches) {
					var j,
					    matchIndexes = fn([], seed.length, argument),
					    i = matchIndexes.length;

					// Match elements found at the specified indexes
					while (i--) {
						if (seed[j = matchIndexes[i]]) {
							seed[j] = !(matches[j] = seed[j]);
						}
					}
				});
			});
		}

		/**
   * Checks a node for validity as a Sizzle context
   * @param {Element|Object=} context
   * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
   */
		function testContext(context) {
			return context && typeof context.getElementsByTagName !== "undefined" && context;
		}

		// Expose support vars for convenience
		support = Sizzle.support = {};

		/**
   * Detects XML nodes
   * @param {Element|Object} elem An element or a document
   * @returns {Boolean} True iff elem is a non-HTML XML node
   */
		isXML = Sizzle.isXML = function (elem) {
			// documentElement is verified for cases where it doesn't yet exist
			// (such as loading iframes in IE - #4833)
			var documentElement = elem && (elem.ownerDocument || elem).documentElement;
			return documentElement ? documentElement.nodeName !== "HTML" : false;
		};

		/**
   * Sets document-related variables once based on the current document
   * @param {Element|Object} [doc] An element or document object to use to set the document
   * @returns {Object} Returns the current document
   */
		setDocument = Sizzle.setDocument = function (node) {
			var hasCompare,
			    subWindow,
			    doc = node ? node.ownerDocument || node : preferredDoc;

			// Return early if doc is invalid or already selected
			if (doc === document || doc.nodeType !== 9 || !doc.documentElement) {
				return document;
			}

			// Update global variables
			document = doc;
			docElem = document.documentElement;
			documentIsHTML = !isXML(document);

			// Support: IE 9-11, Edge
			// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
			if (preferredDoc !== document && (subWindow = document.defaultView) && subWindow.top !== subWindow) {

				// Support: IE 11, Edge
				if (subWindow.addEventListener) {
					subWindow.addEventListener("unload", unloadHandler, false);

					// Support: IE 9 - 10 only
				} else if (subWindow.attachEvent) {
					subWindow.attachEvent("onunload", unloadHandler);
				}
			}

			/* Attributes
   ---------------------------------------------------------------------- */

			// Support: IE<8
			// Verify that getAttribute really returns attributes and not properties
			// (excepting IE8 booleans)
			support.attributes = assert(function (el) {
				el.className = "i";
				return !el.getAttribute("className");
			});

			/* getElement(s)By*
   ---------------------------------------------------------------------- */

			// Check if getElementsByTagName("*") returns only elements
			support.getElementsByTagName = assert(function (el) {
				el.appendChild(document.createComment(""));
				return !el.getElementsByTagName("*").length;
			});

			// Support: IE<9
			support.getElementsByClassName = rnative.test(document.getElementsByClassName);

			// Support: IE<10
			// Check if getElementById returns elements by name
			// The broken getElementById methods don't pick up programmatically-set names,
			// so use a roundabout getElementsByName test
			support.getById = assert(function (el) {
				docElem.appendChild(el).id = expando;
				return !document.getElementsByName || !document.getElementsByName(expando).length;
			});

			// ID filter and find
			if (support.getById) {
				Expr.filter["ID"] = function (id) {
					var attrId = id.replace(runescape, funescape);
					return function (elem) {
						return elem.getAttribute("id") === attrId;
					};
				};
				Expr.find["ID"] = function (id, context) {
					if (typeof context.getElementById !== "undefined" && documentIsHTML) {
						var elem = context.getElementById(id);
						return elem ? [elem] : [];
					}
				};
			} else {
				Expr.filter["ID"] = function (id) {
					var attrId = id.replace(runescape, funescape);
					return function (elem) {
						var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
						return node && node.value === attrId;
					};
				};

				// Support: IE 6 - 7 only
				// getElementById is not reliable as a find shortcut
				Expr.find["ID"] = function (id, context) {
					if (typeof context.getElementById !== "undefined" && documentIsHTML) {
						var node,
						    i,
						    elems,
						    elem = context.getElementById(id);

						if (elem) {

							// Verify the id attribute
							node = elem.getAttributeNode("id");
							if (node && node.value === id) {
								return [elem];
							}

							// Fall back on getElementsByName
							elems = context.getElementsByName(id);
							i = 0;
							while (elem = elems[i++]) {
								node = elem.getAttributeNode("id");
								if (node && node.value === id) {
									return [elem];
								}
							}
						}

						return [];
					}
				};
			}

			// Tag
			Expr.find["TAG"] = support.getElementsByTagName ? function (tag, context) {
				if (typeof context.getElementsByTagName !== "undefined") {
					return context.getElementsByTagName(tag);

					// DocumentFragment nodes don't have gEBTN
				} else if (support.qsa) {
					return context.querySelectorAll(tag);
				}
			} : function (tag, context) {
				var elem,
				    tmp = [],
				    i = 0,

				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName(tag);

				// Filter out possible comments
				if (tag === "*") {
					while (elem = results[i++]) {
						if (elem.nodeType === 1) {
							tmp.push(elem);
						}
					}

					return tmp;
				}
				return results;
			};

			// Class
			Expr.find["CLASS"] = support.getElementsByClassName && function (className, context) {
				if (typeof context.getElementsByClassName !== "undefined" && documentIsHTML) {
					return context.getElementsByClassName(className);
				}
			};

			/* QSA/matchesSelector
   ---------------------------------------------------------------------- */

			// QSA and matchesSelector support

			// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
			rbuggyMatches = [];

			// qSa(:focus) reports false when true (Chrome 21)
			// We allow this because of a bug in IE8/9 that throws an error
			// whenever `document.activeElement` is accessed on an iframe
			// So, we allow :focus to pass through QSA all the time to avoid the IE error
			// See https://bugs.jquery.com/ticket/13378
			rbuggyQSA = [];

			if (support.qsa = rnative.test(document.querySelectorAll)) {
				// Build QSA regex
				// Regex strategy adopted from Diego Perini
				assert(function (el) {
					// Select is set to empty string on purpose
					// This is to test IE's treatment of not explicitly
					// setting a boolean content attribute,
					// since its presence should be enough
					// https://bugs.jquery.com/ticket/12359
					docElem.appendChild(el).innerHTML = "<a id='" + expando + "'></a>" + "<select id='" + expando + "-\r\\' msallowcapture=''>" + "<option selected=''></option></select>";

					// Support: IE8, Opera 11-12.16
					// Nothing should be selected when empty strings follow ^= or $= or *=
					// The test attribute must be unknown in Opera but "safe" for WinRT
					// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
					if (el.querySelectorAll("[msallowcapture^='']").length) {
						rbuggyQSA.push("[*^$]=" + whitespace + "*(?:''|\"\")");
					}

					// Support: IE8
					// Boolean attributes and "value" are not treated correctly
					if (!el.querySelectorAll("[selected]").length) {
						rbuggyQSA.push("\\[" + whitespace + "*(?:value|" + booleans + ")");
					}

					// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
					if (!el.querySelectorAll("[id~=" + expando + "-]").length) {
						rbuggyQSA.push("~=");
					}

					// Webkit/Opera - :checked should return selected option elements
					// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
					// IE8 throws error here and will not see later tests
					if (!el.querySelectorAll(":checked").length) {
						rbuggyQSA.push(":checked");
					}

					// Support: Safari 8+, iOS 8+
					// https://bugs.webkit.org/show_bug.cgi?id=136851
					// In-page `selector#id sibling-combinator selector` fails
					if (!el.querySelectorAll("a#" + expando + "+*").length) {
						rbuggyQSA.push(".#.+[+~]");
					}
				});

				assert(function (el) {
					el.innerHTML = "<a href='' disabled='disabled'></a>" + "<select disabled='disabled'><option/></select>";

					// Support: Windows 8 Native Apps
					// The type and name attributes are restricted during .innerHTML assignment
					var input = document.createElement("input");
					input.setAttribute("type", "hidden");
					el.appendChild(input).setAttribute("name", "D");

					// Support: IE8
					// Enforce case-sensitivity of name attribute
					if (el.querySelectorAll("[name=d]").length) {
						rbuggyQSA.push("name" + whitespace + "*[*^$|!~]?=");
					}

					// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
					// IE8 throws error here and will not see later tests
					if (el.querySelectorAll(":enabled").length !== 2) {
						rbuggyQSA.push(":enabled", ":disabled");
					}

					// Support: IE9-11+
					// IE's :disabled selector does not pick up the children of disabled fieldsets
					docElem.appendChild(el).disabled = true;
					if (el.querySelectorAll(":disabled").length !== 2) {
						rbuggyQSA.push(":enabled", ":disabled");
					}

					// Opera 10-11 does not throw on post-comma invalid pseudos
					el.querySelectorAll("*,:x");
					rbuggyQSA.push(",.*:");
				});
			}

			if (support.matchesSelector = rnative.test(matches = docElem.matches || docElem.webkitMatchesSelector || docElem.mozMatchesSelector || docElem.oMatchesSelector || docElem.msMatchesSelector)) {

				assert(function (el) {
					// Check to see if it's possible to do matchesSelector
					// on a disconnected node (IE 9)
					support.disconnectedMatch = matches.call(el, "*");

					// This should fail with an exception
					// Gecko does not error, returns false instead
					matches.call(el, "[s!='']:x");
					rbuggyMatches.push("!=", pseudos);
				});
			}

			rbuggyQSA = rbuggyQSA.length && new RegExp(rbuggyQSA.join("|"));
			rbuggyMatches = rbuggyMatches.length && new RegExp(rbuggyMatches.join("|"));

			/* Contains
   ---------------------------------------------------------------------- */
			hasCompare = rnative.test(docElem.compareDocumentPosition);

			// Element contains another
			// Purposefully self-exclusive
			// As in, an element does not contain itself
			contains = hasCompare || rnative.test(docElem.contains) ? function (a, b) {
				var adown = a.nodeType === 9 ? a.documentElement : a,
				    bup = b && b.parentNode;
				return a === bup || !!(bup && bup.nodeType === 1 && (adown.contains ? adown.contains(bup) : a.compareDocumentPosition && a.compareDocumentPosition(bup) & 16));
			} : function (a, b) {
				if (b) {
					while (b = b.parentNode) {
						if (b === a) {
							return true;
						}
					}
				}
				return false;
			};

			/* Sorting
   ---------------------------------------------------------------------- */

			// Document order sorting
			sortOrder = hasCompare ? function (a, b) {

				// Flag for duplicate removal
				if (a === b) {
					hasDuplicate = true;
					return 0;
				}

				// Sort on method existence if only one input has compareDocumentPosition
				var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
				if (compare) {
					return compare;
				}

				// Calculate position if both inputs belong to the same document
				compare = (a.ownerDocument || a) === (b.ownerDocument || b) ? a.compareDocumentPosition(b) :

				// Otherwise we know they are disconnected
				1;

				// Disconnected nodes
				if (compare & 1 || !support.sortDetached && b.compareDocumentPosition(a) === compare) {

					// Choose the first element that is related to our preferred document
					if (a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a)) {
						return -1;
					}
					if (b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b)) {
						return 1;
					}

					// Maintain original order
					return sortInput ? indexOf(sortInput, a) - indexOf(sortInput, b) : 0;
				}

				return compare & 4 ? -1 : 1;
			} : function (a, b) {
				// Exit early if the nodes are identical
				if (a === b) {
					hasDuplicate = true;
					return 0;
				}

				var cur,
				    i = 0,
				    aup = a.parentNode,
				    bup = b.parentNode,
				    ap = [a],
				    bp = [b];

				// Parentless nodes are either documents or disconnected
				if (!aup || !bup) {
					return a === document ? -1 : b === document ? 1 : aup ? -1 : bup ? 1 : sortInput ? indexOf(sortInput, a) - indexOf(sortInput, b) : 0;

					// If the nodes are siblings, we can do a quick check
				} else if (aup === bup) {
					return siblingCheck(a, b);
				}

				// Otherwise we need full lists of their ancestors for comparison
				cur = a;
				while (cur = cur.parentNode) {
					ap.unshift(cur);
				}
				cur = b;
				while (cur = cur.parentNode) {
					bp.unshift(cur);
				}

				// Walk down the tree looking for a discrepancy
				while (ap[i] === bp[i]) {
					i++;
				}

				return i ?
				// Do a sibling check if the nodes have a common ancestor
				siblingCheck(ap[i], bp[i]) :

				// Otherwise nodes in our document sort first
				ap[i] === preferredDoc ? -1 : bp[i] === preferredDoc ? 1 : 0;
			};

			return document;
		};

		Sizzle.matches = function (expr, elements) {
			return Sizzle(expr, null, null, elements);
		};

		Sizzle.matchesSelector = function (elem, expr) {
			// Set document vars if needed
			if ((elem.ownerDocument || elem) !== document) {
				setDocument(elem);
			}

			// Make sure that attribute selectors are quoted
			expr = expr.replace(rattributeQuotes, "='$1']");

			if (support.matchesSelector && documentIsHTML && !compilerCache[expr + " "] && (!rbuggyMatches || !rbuggyMatches.test(expr)) && (!rbuggyQSA || !rbuggyQSA.test(expr))) {

				try {
					var ret = matches.call(elem, expr);

					// IE 9's matchesSelector returns false on disconnected nodes
					if (ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11) {
						return ret;
					}
				} catch (e) {}
			}

			return Sizzle(expr, document, null, [elem]).length > 0;
		};

		Sizzle.contains = function (context, elem) {
			// Set document vars if needed
			if ((context.ownerDocument || context) !== document) {
				setDocument(context);
			}
			return contains(context, elem);
		};

		Sizzle.attr = function (elem, name) {
			// Set document vars if needed
			if ((elem.ownerDocument || elem) !== document) {
				setDocument(elem);
			}

			var fn = Expr.attrHandle[name.toLowerCase()],

			// Don't get fooled by Object.prototype properties (jQuery #13807)
			val = fn && hasOwn.call(Expr.attrHandle, name.toLowerCase()) ? fn(elem, name, !documentIsHTML) : undefined;

			return val !== undefined ? val : support.attributes || !documentIsHTML ? elem.getAttribute(name) : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
		};

		Sizzle.escape = function (sel) {
			return (sel + "").replace(rcssescape, fcssescape);
		};

		Sizzle.error = function (msg) {
			throw new Error("Syntax error, unrecognized expression: " + msg);
		};

		/**
   * Document sorting and removing duplicates
   * @param {ArrayLike} results
   */
		Sizzle.uniqueSort = function (results) {
			var elem,
			    duplicates = [],
			    j = 0,
			    i = 0;

			// Unless we *know* we can detect duplicates, assume their presence
			hasDuplicate = !support.detectDuplicates;
			sortInput = !support.sortStable && results.slice(0);
			results.sort(sortOrder);

			if (hasDuplicate) {
				while (elem = results[i++]) {
					if (elem === results[i]) {
						j = duplicates.push(i);
					}
				}
				while (j--) {
					results.splice(duplicates[j], 1);
				}
			}

			// Clear input after sorting to release objects
			// See https://github.com/jquery/sizzle/pull/225
			sortInput = null;

			return results;
		};

		/**
   * Utility function for retrieving the text value of an array of DOM nodes
   * @param {Array|Element} elem
   */
		getText = Sizzle.getText = function (elem) {
			var node,
			    ret = "",
			    i = 0,
			    nodeType = elem.nodeType;

			if (!nodeType) {
				// If no nodeType, this is expected to be an array
				while (node = elem[i++]) {
					// Do not traverse comment nodes
					ret += getText(node);
				}
			} else if (nodeType === 1 || nodeType === 9 || nodeType === 11) {
				// Use textContent for elements
				// innerText usage removed for consistency of new lines (jQuery #11153)
				if (typeof elem.textContent === "string") {
					return elem.textContent;
				} else {
					// Traverse its children
					for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
						ret += getText(elem);
					}
				}
			} else if (nodeType === 3 || nodeType === 4) {
				return elem.nodeValue;
			}
			// Do not include comment or processing instruction nodes

			return ret;
		};

		Expr = Sizzle.selectors = {

			// Can be adjusted by the user
			cacheLength: 50,

			createPseudo: markFunction,

			match: matchExpr,

			attrHandle: {},

			find: {},

			relative: {
				">": { dir: "parentNode", first: true },
				" ": { dir: "parentNode" },
				"+": { dir: "previousSibling", first: true },
				"~": { dir: "previousSibling" }
			},

			preFilter: {
				"ATTR": function ATTR(match) {
					match[1] = match[1].replace(runescape, funescape);

					// Move the given value to match[3] whether quoted or unquoted
					match[3] = (match[3] || match[4] || match[5] || "").replace(runescape, funescape);

					if (match[2] === "~=") {
						match[3] = " " + match[3] + " ";
					}

					return match.slice(0, 4);
				},

				"CHILD": function CHILD(match) {
					/* matches from matchExpr["CHILD"]
     	1 type (only|nth|...)
     	2 what (child|of-type)
     	3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
     	4 xn-component of xn+y argument ([+-]?\d*n|)
     	5 sign of xn-component
     	6 x of xn-component
     	7 sign of y-component
     	8 y of y-component
     */
					match[1] = match[1].toLowerCase();

					if (match[1].slice(0, 3) === "nth") {
						// nth-* requires argument
						if (!match[3]) {
							Sizzle.error(match[0]);
						}

						// numeric x and y parameters for Expr.filter.CHILD
						// remember that false/true cast respectively to 0/1
						match[4] = +(match[4] ? match[5] + (match[6] || 1) : 2 * (match[3] === "even" || match[3] === "odd"));
						match[5] = +(match[7] + match[8] || match[3] === "odd");

						// other types prohibit arguments
					} else if (match[3]) {
						Sizzle.error(match[0]);
					}

					return match;
				},

				"PSEUDO": function PSEUDO(match) {
					var excess,
					    unquoted = !match[6] && match[2];

					if (matchExpr["CHILD"].test(match[0])) {
						return null;
					}

					// Accept quoted arguments as-is
					if (match[3]) {
						match[2] = match[4] || match[5] || "";

						// Strip excess characters from unquoted arguments
					} else if (unquoted && rpseudo.test(unquoted) && (
					// Get excess from tokenize (recursively)
					excess = tokenize(unquoted, true)) && (
					// advance to the next closing parenthesis
					excess = unquoted.indexOf(")", unquoted.length - excess) - unquoted.length)) {

						// excess is a negative index
						match[0] = match[0].slice(0, excess);
						match[2] = unquoted.slice(0, excess);
					}

					// Return only captures needed by the pseudo filter method (type and argument)
					return match.slice(0, 3);
				}
			},

			filter: {

				"TAG": function TAG(nodeNameSelector) {
					var nodeName = nodeNameSelector.replace(runescape, funescape).toLowerCase();
					return nodeNameSelector === "*" ? function () {
						return true;
					} : function (elem) {
						return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
					};
				},

				"CLASS": function CLASS(className) {
					var pattern = classCache[className + " "];

					return pattern || (pattern = new RegExp("(^|" + whitespace + ")" + className + "(" + whitespace + "|$)")) && classCache(className, function (elem) {
						return pattern.test(typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "");
					});
				},

				"ATTR": function ATTR(name, operator, check) {
					return function (elem) {
						var result = Sizzle.attr(elem, name);

						if (result == null) {
							return operator === "!=";
						}
						if (!operator) {
							return true;
						}

						result += "";

						return operator === "=" ? result === check : operator === "!=" ? result !== check : operator === "^=" ? check && result.indexOf(check) === 0 : operator === "*=" ? check && result.indexOf(check) > -1 : operator === "$=" ? check && result.slice(-check.length) === check : operator === "~=" ? (" " + result.replace(rwhitespace, " ") + " ").indexOf(check) > -1 : operator === "|=" ? result === check || result.slice(0, check.length + 1) === check + "-" : false;
					};
				},

				"CHILD": function CHILD(type, what, argument, first, last) {
					var simple = type.slice(0, 3) !== "nth",
					    forward = type.slice(-4) !== "last",
					    ofType = what === "of-type";

					return first === 1 && last === 0 ?

					// Shortcut for :nth-*(n)
					function (elem) {
						return !!elem.parentNode;
					} : function (elem, context, xml) {
						var cache,
						    uniqueCache,
						    outerCache,
						    node,
						    nodeIndex,
						    start,
						    dir = simple !== forward ? "nextSibling" : "previousSibling",
						    parent = elem.parentNode,
						    name = ofType && elem.nodeName.toLowerCase(),
						    useCache = !xml && !ofType,
						    diff = false;

						if (parent) {

							// :(first|last|only)-(child|of-type)
							if (simple) {
								while (dir) {
									node = elem;
									while (node = node[dir]) {
										if (ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) {

											return false;
										}
									}
									// Reverse direction for :only-* (if we haven't yet done so)
									start = dir = type === "only" && !start && "nextSibling";
								}
								return true;
							}

							start = [forward ? parent.firstChild : parent.lastChild];

							// non-xml :nth-child(...) stores cache data on `parent`
							if (forward && useCache) {

								// Seek `elem` from a previously-cached index

								// ...in a gzip-friendly way
								node = parent;
								outerCache = node[expando] || (node[expando] = {});

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});

								cache = uniqueCache[type] || [];
								nodeIndex = cache[0] === dirruns && cache[1];
								diff = nodeIndex && cache[2];
								node = nodeIndex && parent.childNodes[nodeIndex];

								while (node = ++nodeIndex && node && node[dir] || (

								// Fallback to seeking `elem` from the start
								diff = nodeIndex = 0) || start.pop()) {

									// When found, cache indexes on `parent` and break
									if (node.nodeType === 1 && ++diff && node === elem) {
										uniqueCache[type] = [dirruns, nodeIndex, diff];
										break;
									}
								}
							} else {
								// Use previously-cached element index if available
								if (useCache) {
									// ...in a gzip-friendly way
									node = elem;
									outerCache = node[expando] || (node[expando] = {});

									// Support: IE <9 only
									// Defend against cloned attroperties (jQuery gh-1709)
									uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});

									cache = uniqueCache[type] || [];
									nodeIndex = cache[0] === dirruns && cache[1];
									diff = nodeIndex;
								}

								// xml :nth-child(...)
								// or :nth-last-child(...) or :nth(-last)?-of-type(...)
								if (diff === false) {
									// Use the same loop as above to seek `elem` from the start
									while (node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop()) {

										if ((ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) && ++diff) {

											// Cache the index of each encountered element
											if (useCache) {
												outerCache = node[expando] || (node[expando] = {});

												// Support: IE <9 only
												// Defend against cloned attroperties (jQuery gh-1709)
												uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});

												uniqueCache[type] = [dirruns, diff];
											}

											if (node === elem) {
												break;
											}
										}
									}
								}
							}

							// Incorporate the offset, then check against cycle size
							diff -= last;
							return diff === first || diff % first === 0 && diff / first >= 0;
						}
					};
				},

				"PSEUDO": function PSEUDO(pseudo, argument) {
					// pseudo-class names are case-insensitive
					// http://www.w3.org/TR/selectors/#pseudo-classes
					// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
					// Remember that setFilters inherits from pseudos
					var args,
					    fn = Expr.pseudos[pseudo] || Expr.setFilters[pseudo.toLowerCase()] || Sizzle.error("unsupported pseudo: " + pseudo);

					// The user may use createPseudo to indicate that
					// arguments are needed to create the filter function
					// just as Sizzle does
					if (fn[expando]) {
						return fn(argument);
					}

					// But maintain support for old signatures
					if (fn.length > 1) {
						args = [pseudo, pseudo, "", argument];
						return Expr.setFilters.hasOwnProperty(pseudo.toLowerCase()) ? markFunction(function (seed, matches) {
							var idx,
							    matched = fn(seed, argument),
							    i = matched.length;
							while (i--) {
								idx = indexOf(seed, matched[i]);
								seed[idx] = !(matches[idx] = matched[i]);
							}
						}) : function (elem) {
							return fn(elem, 0, args);
						};
					}

					return fn;
				}
			},

			pseudos: {
				// Potentially complex pseudos
				"not": markFunction(function (selector) {
					// Trim the selector passed to compile
					// to avoid treating leading and trailing
					// spaces as combinators
					var input = [],
					    results = [],
					    matcher = compile(selector.replace(rtrim, "$1"));

					return matcher[expando] ? markFunction(function (seed, matches, context, xml) {
						var elem,
						    unmatched = matcher(seed, null, xml, []),
						    i = seed.length;

						// Match elements unmatched by `matcher`
						while (i--) {
							if (elem = unmatched[i]) {
								seed[i] = !(matches[i] = elem);
							}
						}
					}) : function (elem, context, xml) {
						input[0] = elem;
						matcher(input, null, xml, results);
						// Don't keep the element (issue #299)
						input[0] = null;
						return !results.pop();
					};
				}),

				"has": markFunction(function (selector) {
					return function (elem) {
						return Sizzle(selector, elem).length > 0;
					};
				}),

				"contains": markFunction(function (text) {
					text = text.replace(runescape, funescape);
					return function (elem) {
						return (elem.textContent || elem.innerText || getText(elem)).indexOf(text) > -1;
					};
				}),

				// "Whether an element is represented by a :lang() selector
				// is based solely on the element's language value
				// being equal to the identifier C,
				// or beginning with the identifier C immediately followed by "-".
				// The matching of C against the element's language value is performed case-insensitively.
				// The identifier C does not have to be a valid language name."
				// http://www.w3.org/TR/selectors/#lang-pseudo
				"lang": markFunction(function (lang) {
					// lang value must be a valid identifier
					if (!ridentifier.test(lang || "")) {
						Sizzle.error("unsupported lang: " + lang);
					}
					lang = lang.replace(runescape, funescape).toLowerCase();
					return function (elem) {
						var elemLang;
						do {
							if (elemLang = documentIsHTML ? elem.lang : elem.getAttribute("xml:lang") || elem.getAttribute("lang")) {

								elemLang = elemLang.toLowerCase();
								return elemLang === lang || elemLang.indexOf(lang + "-") === 0;
							}
						} while ((elem = elem.parentNode) && elem.nodeType === 1);
						return false;
					};
				}),

				// Miscellaneous
				"target": function target(elem) {
					var hash = window.location && window.location.hash;
					return hash && hash.slice(1) === elem.id;
				},

				"root": function root(elem) {
					return elem === docElem;
				},

				"focus": function focus(elem) {
					return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
				},

				// Boolean properties
				"enabled": createDisabledPseudo(false),
				"disabled": createDisabledPseudo(true),

				"checked": function checked(elem) {
					// In CSS3, :checked should return both checked and selected elements
					// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
					var nodeName = elem.nodeName.toLowerCase();
					return nodeName === "input" && !!elem.checked || nodeName === "option" && !!elem.selected;
				},

				"selected": function selected(elem) {
					// Accessing this property makes selected-by-default
					// options in Safari work properly
					if (elem.parentNode) {
						elem.parentNode.selectedIndex;
					}

					return elem.selected === true;
				},

				// Contents
				"empty": function empty(elem) {
					// http://www.w3.org/TR/selectors/#empty-pseudo
					// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
					//   but not by others (comment: 8; processing instruction: 7; etc.)
					// nodeType < 6 works because attributes (2) do not appear as children
					for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
						if (elem.nodeType < 6) {
							return false;
						}
					}
					return true;
				},

				"parent": function parent(elem) {
					return !Expr.pseudos["empty"](elem);
				},

				// Element/input types
				"header": function header(elem) {
					return rheader.test(elem.nodeName);
				},

				"input": function input(elem) {
					return rinputs.test(elem.nodeName);
				},

				"button": function button(elem) {
					var name = elem.nodeName.toLowerCase();
					return name === "input" && elem.type === "button" || name === "button";
				},

				"text": function text(elem) {
					var attr;
					return elem.nodeName.toLowerCase() === "input" && elem.type === "text" && (

					// Support: IE<8
					// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
					(attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text");
				},

				// Position-in-collection
				"first": createPositionalPseudo(function () {
					return [0];
				}),

				"last": createPositionalPseudo(function (matchIndexes, length) {
					return [length - 1];
				}),

				"eq": createPositionalPseudo(function (matchIndexes, length, argument) {
					return [argument < 0 ? argument + length : argument];
				}),

				"even": createPositionalPseudo(function (matchIndexes, length) {
					var i = 0;
					for (; i < length; i += 2) {
						matchIndexes.push(i);
					}
					return matchIndexes;
				}),

				"odd": createPositionalPseudo(function (matchIndexes, length) {
					var i = 1;
					for (; i < length; i += 2) {
						matchIndexes.push(i);
					}
					return matchIndexes;
				}),

				"lt": createPositionalPseudo(function (matchIndexes, length, argument) {
					var i = argument < 0 ? argument + length : argument;
					for (; --i >= 0;) {
						matchIndexes.push(i);
					}
					return matchIndexes;
				}),

				"gt": createPositionalPseudo(function (matchIndexes, length, argument) {
					var i = argument < 0 ? argument + length : argument;
					for (; ++i < length;) {
						matchIndexes.push(i);
					}
					return matchIndexes;
				})
			}
		};

		Expr.pseudos["nth"] = Expr.pseudos["eq"];

		// Add button/input type pseudos
		for (i in { radio: true, checkbox: true, file: true, password: true, image: true }) {
			Expr.pseudos[i] = createInputPseudo(i);
		}
		for (i in { submit: true, reset: true }) {
			Expr.pseudos[i] = createButtonPseudo(i);
		}

		// Easy API for creating new setFilters
		function setFilters() {}
		setFilters.prototype = Expr.filters = Expr.pseudos;
		Expr.setFilters = new setFilters();

		tokenize = Sizzle.tokenize = function (selector, parseOnly) {
			var matched,
			    match,
			    tokens,
			    type,
			    soFar,
			    groups,
			    preFilters,
			    cached = tokenCache[selector + " "];

			if (cached) {
				return parseOnly ? 0 : cached.slice(0);
			}

			soFar = selector;
			groups = [];
			preFilters = Expr.preFilter;

			while (soFar) {

				// Comma and first run
				if (!matched || (match = rcomma.exec(soFar))) {
					if (match) {
						// Don't consume trailing commas as valid
						soFar = soFar.slice(match[0].length) || soFar;
					}
					groups.push(tokens = []);
				}

				matched = false;

				// Combinators
				if (match = rcombinators.exec(soFar)) {
					matched = match.shift();
					tokens.push({
						value: matched,
						// Cast descendant combinators to space
						type: match[0].replace(rtrim, " ")
					});
					soFar = soFar.slice(matched.length);
				}

				// Filters
				for (type in Expr.filter) {
					if ((match = matchExpr[type].exec(soFar)) && (!preFilters[type] || (match = preFilters[type](match)))) {
						matched = match.shift();
						tokens.push({
							value: matched,
							type: type,
							matches: match
						});
						soFar = soFar.slice(matched.length);
					}
				}

				if (!matched) {
					break;
				}
			}

			// Return the length of the invalid excess
			// if we're just parsing
			// Otherwise, throw an error or return tokens
			return parseOnly ? soFar.length : soFar ? Sizzle.error(selector) :
			// Cache the tokens
			tokenCache(selector, groups).slice(0);
		};

		function toSelector(tokens) {
			var i = 0,
			    len = tokens.length,
			    selector = "";
			for (; i < len; i++) {
				selector += tokens[i].value;
			}
			return selector;
		}

		function addCombinator(matcher, combinator, base) {
			var dir = combinator.dir,
			    skip = combinator.next,
			    key = skip || dir,
			    checkNonElements = base && key === "parentNode",
			    doneName = done++;

			return combinator.first ?
			// Check against closest ancestor/preceding element
			function (elem, context, xml) {
				while (elem = elem[dir]) {
					if (elem.nodeType === 1 || checkNonElements) {
						return matcher(elem, context, xml);
					}
				}
				return false;
			} :

			// Check against all ancestor/preceding elements
			function (elem, context, xml) {
				var oldCache,
				    uniqueCache,
				    outerCache,
				    newCache = [dirruns, doneName];

				// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
				if (xml) {
					while (elem = elem[dir]) {
						if (elem.nodeType === 1 || checkNonElements) {
							if (matcher(elem, context, xml)) {
								return true;
							}
						}
					}
				} else {
					while (elem = elem[dir]) {
						if (elem.nodeType === 1 || checkNonElements) {
							outerCache = elem[expando] || (elem[expando] = {});

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[elem.uniqueID] || (outerCache[elem.uniqueID] = {});

							if (skip && skip === elem.nodeName.toLowerCase()) {
								elem = elem[dir] || elem;
							} else if ((oldCache = uniqueCache[key]) && oldCache[0] === dirruns && oldCache[1] === doneName) {

								// Assign to newCache so results back-propagate to previous elements
								return newCache[2] = oldCache[2];
							} else {
								// Reuse newcache so results back-propagate to previous elements
								uniqueCache[key] = newCache;

								// A match means we're done; a fail means we have to keep checking
								if (newCache[2] = matcher(elem, context, xml)) {
									return true;
								}
							}
						}
					}
				}
				return false;
			};
		}

		function elementMatcher(matchers) {
			return matchers.length > 1 ? function (elem, context, xml) {
				var i = matchers.length;
				while (i--) {
					if (!matchers[i](elem, context, xml)) {
						return false;
					}
				}
				return true;
			} : matchers[0];
		}

		function multipleContexts(selector, contexts, results) {
			var i = 0,
			    len = contexts.length;
			for (; i < len; i++) {
				Sizzle(selector, contexts[i], results);
			}
			return results;
		}

		function condense(unmatched, map, filter, context, xml) {
			var elem,
			    newUnmatched = [],
			    i = 0,
			    len = unmatched.length,
			    mapped = map != null;

			for (; i < len; i++) {
				if (elem = unmatched[i]) {
					if (!filter || filter(elem, context, xml)) {
						newUnmatched.push(elem);
						if (mapped) {
							map.push(i);
						}
					}
				}
			}

			return newUnmatched;
		}

		function setMatcher(preFilter, selector, matcher, postFilter, postFinder, postSelector) {
			if (postFilter && !postFilter[expando]) {
				postFilter = setMatcher(postFilter);
			}
			if (postFinder && !postFinder[expando]) {
				postFinder = setMatcher(postFinder, postSelector);
			}
			return markFunction(function (seed, results, context, xml) {
				var temp,
				    i,
				    elem,
				    preMap = [],
				    postMap = [],
				    preexisting = results.length,


				// Get initial elements from seed or context
				elems = seed || multipleContexts(selector || "*", context.nodeType ? [context] : context, []),


				// Prefilter to get matcher input, preserving a map for seed-results synchronization
				matcherIn = preFilter && (seed || !selector) ? condense(elems, preMap, preFilter, context, xml) : elems,
				    matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || (seed ? preFilter : preexisting || postFilter) ?

				// ...intermediate processing is necessary
				[] :

				// ...otherwise use results directly
				results : matcherIn;

				// Find primary matches
				if (matcher) {
					matcher(matcherIn, matcherOut, context, xml);
				}

				// Apply postFilter
				if (postFilter) {
					temp = condense(matcherOut, postMap);
					postFilter(temp, [], context, xml);

					// Un-match failing elements by moving them back to matcherIn
					i = temp.length;
					while (i--) {
						if (elem = temp[i]) {
							matcherOut[postMap[i]] = !(matcherIn[postMap[i]] = elem);
						}
					}
				}

				if (seed) {
					if (postFinder || preFilter) {
						if (postFinder) {
							// Get the final matcherOut by condensing this intermediate into postFinder contexts
							temp = [];
							i = matcherOut.length;
							while (i--) {
								if (elem = matcherOut[i]) {
									// Restore matcherIn since elem is not yet a final match
									temp.push(matcherIn[i] = elem);
								}
							}
							postFinder(null, matcherOut = [], temp, xml);
						}

						// Move matched elements from seed to results to keep them synchronized
						i = matcherOut.length;
						while (i--) {
							if ((elem = matcherOut[i]) && (temp = postFinder ? indexOf(seed, elem) : preMap[i]) > -1) {

								seed[temp] = !(results[temp] = elem);
							}
						}
					}

					// Add elements to results, through postFinder if defined
				} else {
					matcherOut = condense(matcherOut === results ? matcherOut.splice(preexisting, matcherOut.length) : matcherOut);
					if (postFinder) {
						postFinder(null, results, matcherOut, xml);
					} else {
						push.apply(results, matcherOut);
					}
				}
			});
		}

		function matcherFromTokens(tokens) {
			var checkContext,
			    matcher,
			    j,
			    len = tokens.length,
			    leadingRelative = Expr.relative[tokens[0].type],
			    implicitRelative = leadingRelative || Expr.relative[" "],
			    i = leadingRelative ? 1 : 0,


			// The foundational matcher ensures that elements are reachable from top-level context(s)
			matchContext = addCombinator(function (elem) {
				return elem === checkContext;
			}, implicitRelative, true),
			    matchAnyContext = addCombinator(function (elem) {
				return indexOf(checkContext, elem) > -1;
			}, implicitRelative, true),
			    matchers = [function (elem, context, xml) {
				var ret = !leadingRelative && (xml || context !== outermostContext) || ((checkContext = context).nodeType ? matchContext(elem, context, xml) : matchAnyContext(elem, context, xml));
				// Avoid hanging onto element (issue #299)
				checkContext = null;
				return ret;
			}];

			for (; i < len; i++) {
				if (matcher = Expr.relative[tokens[i].type]) {
					matchers = [addCombinator(elementMatcher(matchers), matcher)];
				} else {
					matcher = Expr.filter[tokens[i].type].apply(null, tokens[i].matches);

					// Return special upon seeing a positional matcher
					if (matcher[expando]) {
						// Find the next relative operator (if any) for proper handling
						j = ++i;
						for (; j < len; j++) {
							if (Expr.relative[tokens[j].type]) {
								break;
							}
						}
						return setMatcher(i > 1 && elementMatcher(matchers), i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice(0, i - 1).concat({ value: tokens[i - 2].type === " " ? "*" : "" })).replace(rtrim, "$1"), matcher, i < j && matcherFromTokens(tokens.slice(i, j)), j < len && matcherFromTokens(tokens = tokens.slice(j)), j < len && toSelector(tokens));
					}
					matchers.push(matcher);
				}
			}

			return elementMatcher(matchers);
		}

		function matcherFromGroupMatchers(elementMatchers, setMatchers) {
			var bySet = setMatchers.length > 0,
			    byElement = elementMatchers.length > 0,
			    superMatcher = function superMatcher(seed, context, xml, results, outermost) {
				var elem,
				    j,
				    matcher,
				    matchedCount = 0,
				    i = "0",
				    unmatched = seed && [],
				    setMatched = [],
				    contextBackup = outermostContext,

				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]("*", outermost),

				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = dirruns += contextBackup == null ? 1 : Math.random() || 0.1,
				    len = elems.length;

				if (outermost) {
					outermostContext = context === document || context || outermost;
				}

				// Add elements passing elementMatchers directly to results
				// Support: IE<9, Safari
				// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
				for (; i !== len && (elem = elems[i]) != null; i++) {
					if (byElement && elem) {
						j = 0;
						if (!context && elem.ownerDocument !== document) {
							setDocument(elem);
							xml = !documentIsHTML;
						}
						while (matcher = elementMatchers[j++]) {
							if (matcher(elem, context || document, xml)) {
								results.push(elem);
								break;
							}
						}
						if (outermost) {
							dirruns = dirrunsUnique;
						}
					}

					// Track unmatched elements for set filters
					if (bySet) {
						// They will have gone through all possible matchers
						if (elem = !matcher && elem) {
							matchedCount--;
						}

						// Lengthen the array for every element, matched or not
						if (seed) {
							unmatched.push(elem);
						}
					}
				}

				// `i` is now the count of elements visited above, and adding it to `matchedCount`
				// makes the latter nonnegative.
				matchedCount += i;

				// Apply set filters to unmatched elements
				// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
				// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
				// no element matchers and no seed.
				// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
				// case, which will result in a "00" `matchedCount` that differs from `i` but is also
				// numerically zero.
				if (bySet && i !== matchedCount) {
					j = 0;
					while (matcher = setMatchers[j++]) {
						matcher(unmatched, setMatched, context, xml);
					}

					if (seed) {
						// Reintegrate element matches to eliminate the need for sorting
						if (matchedCount > 0) {
							while (i--) {
								if (!(unmatched[i] || setMatched[i])) {
									setMatched[i] = pop.call(results);
								}
							}
						}

						// Discard index placeholder values to get only actual matches
						setMatched = condense(setMatched);
					}

					// Add matches to results
					push.apply(results, setMatched);

					// Seedless set matches succeeding multiple successful matchers stipulate sorting
					if (outermost && !seed && setMatched.length > 0 && matchedCount + setMatchers.length > 1) {

						Sizzle.uniqueSort(results);
					}
				}

				// Override manipulation of globals by nested matchers
				if (outermost) {
					dirruns = dirrunsUnique;
					outermostContext = contextBackup;
				}

				return unmatched;
			};

			return bySet ? markFunction(superMatcher) : superMatcher;
		}

		compile = Sizzle.compile = function (selector, match /* Internal Use Only */) {
			var i,
			    setMatchers = [],
			    elementMatchers = [],
			    cached = compilerCache[selector + " "];

			if (!cached) {
				// Generate a function of recursive functions that can be used to check each element
				if (!match) {
					match = tokenize(selector);
				}
				i = match.length;
				while (i--) {
					cached = matcherFromTokens(match[i]);
					if (cached[expando]) {
						setMatchers.push(cached);
					} else {
						elementMatchers.push(cached);
					}
				}

				// Cache the compiled function
				cached = compilerCache(selector, matcherFromGroupMatchers(elementMatchers, setMatchers));

				// Save selector and tokenization
				cached.selector = selector;
			}
			return cached;
		};

		/**
   * A low-level selection function that works with Sizzle's compiled
   *  selector functions
   * @param {String|Function} selector A selector or a pre-compiled
   *  selector function built with Sizzle.compile
   * @param {Element} context
   * @param {Array} [results]
   * @param {Array} [seed] A set of elements to match against
   */
		select = Sizzle.select = function (selector, context, results, seed) {
			var i,
			    tokens,
			    token,
			    type,
			    find,
			    compiled = typeof selector === "function" && selector,
			    match = !seed && tokenize(selector = compiled.selector || selector);

			results = results || [];

			// Try to minimize operations if there is only one selector in the list and no seed
			// (the latter of which guarantees us context)
			if (match.length === 1) {

				// Reduce context if the leading compound selector is an ID
				tokens = match[0] = match[0].slice(0);
				if (tokens.length > 2 && (token = tokens[0]).type === "ID" && context.nodeType === 9 && documentIsHTML && Expr.relative[tokens[1].type]) {

					context = (Expr.find["ID"](token.matches[0].replace(runescape, funescape), context) || [])[0];
					if (!context) {
						return results;

						// Precompiled matchers will still verify ancestry, so step up a level
					} else if (compiled) {
						context = context.parentNode;
					}

					selector = selector.slice(tokens.shift().value.length);
				}

				// Fetch a seed set for right-to-left matching
				i = matchExpr["needsContext"].test(selector) ? 0 : tokens.length;
				while (i--) {
					token = tokens[i];

					// Abort if we hit a combinator
					if (Expr.relative[type = token.type]) {
						break;
					}
					if (find = Expr.find[type]) {
						// Search, expanding context for leading sibling combinators
						if (seed = find(token.matches[0].replace(runescape, funescape), rsibling.test(tokens[0].type) && testContext(context.parentNode) || context)) {

							// If seed is empty or no tokens remain, we can return early
							tokens.splice(i, 1);
							selector = seed.length && toSelector(tokens);
							if (!selector) {
								push.apply(results, seed);
								return results;
							}

							break;
						}
					}
				}
			}

			// Compile and execute a filtering function if one is not provided
			// Provide `match` to avoid retokenization if we modified the selector above
			(compiled || compile(selector, match))(seed, context, !documentIsHTML, results, !context || rsibling.test(selector) && testContext(context.parentNode) || context);
			return results;
		};

		// One-time assignments

		// Sort stability
		support.sortStable = expando.split("").sort(sortOrder).join("") === expando;

		// Support: Chrome 14-35+
		// Always assume duplicates if they aren't passed to the comparison function
		support.detectDuplicates = !!hasDuplicate;

		// Initialize against the default document
		setDocument();

		// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
		// Detached nodes confoundingly follow *each other*
		support.sortDetached = assert(function (el) {
			// Should return 1, but returns 4 (following)
			return el.compareDocumentPosition(document.createElement("fieldset")) & 1;
		});

		// Support: IE<8
		// Prevent attribute/property "interpolation"
		// https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
		if (!assert(function (el) {
			el.innerHTML = "<a href='#'></a>";
			return el.firstChild.getAttribute("href") === "#";
		})) {
			addHandle("type|href|height|width", function (elem, name, isXML) {
				if (!isXML) {
					return elem.getAttribute(name, name.toLowerCase() === "type" ? 1 : 2);
				}
			});
		}

		// Support: IE<9
		// Use defaultValue in place of getAttribute("value")
		if (!support.attributes || !assert(function (el) {
			el.innerHTML = "<input/>";
			el.firstChild.setAttribute("value", "");
			return el.firstChild.getAttribute("value") === "";
		})) {
			addHandle("value", function (elem, name, isXML) {
				if (!isXML && elem.nodeName.toLowerCase() === "input") {
					return elem.defaultValue;
				}
			});
		}

		// Support: IE<9
		// Use getAttributeNode to fetch booleans when getAttribute lies
		if (!assert(function (el) {
			return el.getAttribute("disabled") == null;
		})) {
			addHandle(booleans, function (elem, name, isXML) {
				var val;
				if (!isXML) {
					return elem[name] === true ? name.toLowerCase() : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
				}
			});
		}

		return Sizzle;
	}(window);

	jQuery.find = Sizzle;
	jQuery.expr = Sizzle.selectors;

	// Deprecated
	jQuery.expr[":"] = jQuery.expr.pseudos;
	jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
	jQuery.text = Sizzle.getText;
	jQuery.isXMLDoc = Sizzle.isXML;
	jQuery.contains = Sizzle.contains;
	jQuery.escapeSelector = Sizzle.escape;

	var dir = function dir(elem, _dir, until) {
		var matched = [],
		    truncate = until !== undefined;

		while ((elem = elem[_dir]) && elem.nodeType !== 9) {
			if (elem.nodeType === 1) {
				if (truncate && jQuery(elem).is(until)) {
					break;
				}
				matched.push(elem);
			}
		}
		return matched;
	};

	var _siblings = function _siblings(n, elem) {
		var matched = [];

		for (; n; n = n.nextSibling) {
			if (n.nodeType === 1 && n !== elem) {
				matched.push(n);
			}
		}

		return matched;
	};

	var rneedsContext = jQuery.expr.match.needsContext;

	function nodeName(elem, name) {

		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	}
	var rsingleTag = /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i;

	var risSimple = /^.[^:#\[\.,]*$/;

	// Implement the identical functionality for filter and not
	function winnow(elements, qualifier, not) {
		if (jQuery.isFunction(qualifier)) {
			return jQuery.grep(elements, function (elem, i) {
				return !!qualifier.call(elem, i, elem) !== not;
			});
		}

		// Single element
		if (qualifier.nodeType) {
			return jQuery.grep(elements, function (elem) {
				return elem === qualifier !== not;
			});
		}

		// Arraylike of elements (jQuery, arguments, Array)
		if (typeof qualifier !== "string") {
			return jQuery.grep(elements, function (elem) {
				return indexOf.call(qualifier, elem) > -1 !== not;
			});
		}

		// Simple selector that can be filtered directly, removing non-Elements
		if (risSimple.test(qualifier)) {
			return jQuery.filter(qualifier, elements, not);
		}

		// Complex selector, compare the two sets, removing non-Elements
		qualifier = jQuery.filter(qualifier, elements);
		return jQuery.grep(elements, function (elem) {
			return indexOf.call(qualifier, elem) > -1 !== not && elem.nodeType === 1;
		});
	}

	jQuery.filter = function (expr, elems, not) {
		var elem = elems[0];

		if (not) {
			expr = ":not(" + expr + ")";
		}

		if (elems.length === 1 && elem.nodeType === 1) {
			return jQuery.find.matchesSelector(elem, expr) ? [elem] : [];
		}

		return jQuery.find.matches(expr, jQuery.grep(elems, function (elem) {
			return elem.nodeType === 1;
		}));
	};

	jQuery.fn.extend({
		find: function find(selector) {
			var i,
			    ret,
			    len = this.length,
			    self = this;

			if (typeof selector !== "string") {
				return this.pushStack(jQuery(selector).filter(function () {
					for (i = 0; i < len; i++) {
						if (jQuery.contains(self[i], this)) {
							return true;
						}
					}
				}));
			}

			ret = this.pushStack([]);

			for (i = 0; i < len; i++) {
				jQuery.find(selector, self[i], ret);
			}

			return len > 1 ? jQuery.uniqueSort(ret) : ret;
		},
		filter: function filter(selector) {
			return this.pushStack(winnow(this, selector || [], false));
		},
		not: function not(selector) {
			return this.pushStack(winnow(this, selector || [], true));
		},
		is: function is(selector) {
			return !!winnow(this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test(selector) ? jQuery(selector) : selector || [], false).length;
		}
	});

	// Initialize a jQuery object


	// A central reference to the root jQuery(document)
	var rootjQuery,


	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	// Shortcut simple #id case for speed
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,
	    init = jQuery.fn.init = function (selector, context, root) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if (!selector) {
			return this;
		}

		// Method init() accepts an alternate rootjQuery
		// so migrate can support jQuery.sub (gh-2101)
		root = root || rootjQuery;

		// Handle HTML strings
		if (typeof selector === "string") {
			if (selector[0] === "<" && selector[selector.length - 1] === ">" && selector.length >= 3) {

				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [null, selector, null];
			} else {
				match = rquickExpr.exec(selector);
			}

			// Match html or make sure no context is specified for #id
			if (match && (match[1] || !context)) {

				// HANDLE: $(html) -> $(array)
				if (match[1]) {
					context = context instanceof jQuery ? context[0] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge(this, jQuery.parseHTML(match[1], context && context.nodeType ? context.ownerDocument || context : document, true));

					// HANDLE: $(html, props)
					if (rsingleTag.test(match[1]) && jQuery.isPlainObject(context)) {
						for (match in context) {

							// Properties of context are called as methods if possible
							if (jQuery.isFunction(this[match])) {
								this[match](context[match]);

								// ...and otherwise set as attributes
							} else {
								this.attr(match, context[match]);
							}
						}
					}

					return this;

					// HANDLE: $(#id)
				} else {
					elem = document.getElementById(match[2]);

					if (elem) {

						// Inject the element directly into the jQuery object
						this[0] = elem;
						this.length = 1;
					}
					return this;
				}

				// HANDLE: $(expr, $(...))
			} else if (!context || context.jquery) {
				return (context || root).find(selector);

				// HANDLE: $(expr, context)
				// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor(context).find(selector);
			}

			// HANDLE: $(DOMElement)
		} else if (selector.nodeType) {
			this[0] = selector;
			this.length = 1;
			return this;

			// HANDLE: $(function)
			// Shortcut for document ready
		} else if (jQuery.isFunction(selector)) {
			return root.ready !== undefined ? root.ready(selector) :

			// Execute immediately if ready is not present
			selector(jQuery);
		}

		return jQuery.makeArray(selector, this);
	};

	// Give the init function the jQuery prototype for later instantiation
	init.prototype = jQuery.fn;

	// Initialize central reference
	rootjQuery = jQuery(document);

	var rparentsprev = /^(?:parents|prev(?:Until|All))/,


	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

	jQuery.fn.extend({
		has: function has(target) {
			var targets = jQuery(target, this),
			    l = targets.length;

			return this.filter(function () {
				var i = 0;
				for (; i < l; i++) {
					if (jQuery.contains(this, targets[i])) {
						return true;
					}
				}
			});
		},

		closest: function closest(selectors, context) {
			var cur,
			    i = 0,
			    l = this.length,
			    matched = [],
			    targets = typeof selectors !== "string" && jQuery(selectors);

			// Positional selectors never match, since there's no _selection_ context
			if (!rneedsContext.test(selectors)) {
				for (; i < l; i++) {
					for (cur = this[i]; cur && cur !== context; cur = cur.parentNode) {

						// Always skip document fragments
						if (cur.nodeType < 11 && (targets ? targets.index(cur) > -1 :

						// Don't pass non-elements to Sizzle
						cur.nodeType === 1 && jQuery.find.matchesSelector(cur, selectors))) {

							matched.push(cur);
							break;
						}
					}
				}
			}

			return this.pushStack(matched.length > 1 ? jQuery.uniqueSort(matched) : matched);
		},

		// Determine the position of an element within the set
		index: function index(elem) {

			// No argument, return index in parent
			if (!elem) {
				return this[0] && this[0].parentNode ? this.first().prevAll().length : -1;
			}

			// Index in selector
			if (typeof elem === "string") {
				return indexOf.call(jQuery(elem), this[0]);
			}

			// Locate the position of the desired element
			return indexOf.call(this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[0] : elem);
		},

		add: function add(selector, context) {
			return this.pushStack(jQuery.uniqueSort(jQuery.merge(this.get(), jQuery(selector, context))));
		},

		addBack: function addBack(selector) {
			return this.add(selector == null ? this.prevObject : this.prevObject.filter(selector));
		}
	});

	function sibling(cur, dir) {
		while ((cur = cur[dir]) && cur.nodeType !== 1) {}
		return cur;
	}

	jQuery.each({
		parent: function parent(elem) {
			var parent = elem.parentNode;
			return parent && parent.nodeType !== 11 ? parent : null;
		},
		parents: function parents(elem) {
			return dir(elem, "parentNode");
		},
		parentsUntil: function parentsUntil(elem, i, until) {
			return dir(elem, "parentNode", until);
		},
		next: function next(elem) {
			return sibling(elem, "nextSibling");
		},
		prev: function prev(elem) {
			return sibling(elem, "previousSibling");
		},
		nextAll: function nextAll(elem) {
			return dir(elem, "nextSibling");
		},
		prevAll: function prevAll(elem) {
			return dir(elem, "previousSibling");
		},
		nextUntil: function nextUntil(elem, i, until) {
			return dir(elem, "nextSibling", until);
		},
		prevUntil: function prevUntil(elem, i, until) {
			return dir(elem, "previousSibling", until);
		},
		siblings: function siblings(elem) {
			return _siblings((elem.parentNode || {}).firstChild, elem);
		},
		children: function children(elem) {
			return _siblings(elem.firstChild);
		},
		contents: function contents(elem) {
			if (nodeName(elem, "iframe")) {
				return elem.contentDocument;
			}

			// Support: IE 9 - 11 only, iOS 7 only, Android Browser <=4.3 only
			// Treat the template element as a regular one in browsers that
			// don't support it.
			if (nodeName(elem, "template")) {
				elem = elem.content || elem;
			}

			return jQuery.merge([], elem.childNodes);
		}
	}, function (name, fn) {
		jQuery.fn[name] = function (until, selector) {
			var matched = jQuery.map(this, fn, until);

			if (name.slice(-5) !== "Until") {
				selector = until;
			}

			if (selector && typeof selector === "string") {
				matched = jQuery.filter(selector, matched);
			}

			if (this.length > 1) {

				// Remove duplicates
				if (!guaranteedUnique[name]) {
					jQuery.uniqueSort(matched);
				}

				// Reverse order for parents* and prev-derivatives
				if (rparentsprev.test(name)) {
					matched.reverse();
				}
			}

			return this.pushStack(matched);
		};
	});
	var rnothtmlwhite = /[^\x20\t\r\n\f]+/g;

	// Convert String-formatted options into Object-formatted ones
	function createOptions(options) {
		var object = {};
		jQuery.each(options.match(rnothtmlwhite) || [], function (_, flag) {
			object[flag] = true;
		});
		return object;
	}

	/*
  * Create a callback list using the following parameters:
  *
  *	options: an optional list of space-separated options that will change how
  *			the callback list behaves or a more traditional option object
  *
  * By default a callback list will act like an event callback list and can be
  * "fired" multiple times.
  *
  * Possible options:
  *
  *	once:			will ensure the callback list can only be fired once (like a Deferred)
  *
  *	memory:			will keep track of previous values and will call any callback added
  *					after the list has been fired right away with the latest "memorized"
  *					values (like a Deferred)
  *
  *	unique:			will ensure a callback can only be added once (no duplicate in the list)
  *
  *	stopOnFalse:	interrupt callings when a callback returns false
  *
  */
	jQuery.Callbacks = function (options) {

		// Convert options from String-formatted to Object-formatted if needed
		// (we check in cache first)
		options = typeof options === "string" ? createOptions(options) : jQuery.extend({}, options);

		var // Flag to know if list is currently firing
		firing,


		// Last fire value for non-forgettable lists
		memory,


		// Flag to know if list was already fired
		_fired,


		// Flag to prevent firing
		_locked,


		// Actual callback list
		list = [],


		// Queue of execution data for repeatable lists
		queue = [],


		// Index of currently firing callback (modified by add/remove as needed)
		firingIndex = -1,


		// Fire callbacks
		fire = function fire() {

			// Enforce single-firing
			_locked = _locked || options.once;

			// Execute callbacks for all pending executions,
			// respecting firingIndex overrides and runtime changes
			_fired = firing = true;
			for (; queue.length; firingIndex = -1) {
				memory = queue.shift();
				while (++firingIndex < list.length) {

					// Run callback and check for early termination
					if (list[firingIndex].apply(memory[0], memory[1]) === false && options.stopOnFalse) {

						// Jump to end and forget the data so .add doesn't re-fire
						firingIndex = list.length;
						memory = false;
					}
				}
			}

			// Forget the data if we're done with it
			if (!options.memory) {
				memory = false;
			}

			firing = false;

			// Clean up if we're done firing for good
			if (_locked) {

				// Keep an empty list if we have data for future add calls
				if (memory) {
					list = [];

					// Otherwise, this object is spent
				} else {
					list = "";
				}
			}
		},


		// Actual Callbacks object
		self = {

			// Add a callback or a collection of callbacks to the list
			add: function add() {
				if (list) {

					// If we have memory from a past run, we should fire after adding
					if (memory && !firing) {
						firingIndex = list.length - 1;
						queue.push(memory);
					}

					(function add(args) {
						jQuery.each(args, function (_, arg) {
							if (jQuery.isFunction(arg)) {
								if (!options.unique || !self.has(arg)) {
									list.push(arg);
								}
							} else if (arg && arg.length && jQuery.type(arg) !== "string") {

								// Inspect recursively
								add(arg);
							}
						});
					})(arguments);

					if (memory && !firing) {
						fire();
					}
				}
				return this;
			},

			// Remove a callback from the list
			remove: function remove() {
				jQuery.each(arguments, function (_, arg) {
					var index;
					while ((index = jQuery.inArray(arg, list, index)) > -1) {
						list.splice(index, 1);

						// Handle firing indexes
						if (index <= firingIndex) {
							firingIndex--;
						}
					}
				});
				return this;
			},

			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function has(fn) {
				return fn ? jQuery.inArray(fn, list) > -1 : list.length > 0;
			},

			// Remove all callbacks from the list
			empty: function empty() {
				if (list) {
					list = [];
				}
				return this;
			},

			// Disable .fire and .add
			// Abort any current/pending executions
			// Clear all callbacks and values
			disable: function disable() {
				_locked = queue = [];
				list = memory = "";
				return this;
			},
			disabled: function disabled() {
				return !list;
			},

			// Disable .fire
			// Also disable .add unless we have memory (since it would have no effect)
			// Abort any pending executions
			lock: function lock() {
				_locked = queue = [];
				if (!memory && !firing) {
					list = memory = "";
				}
				return this;
			},
			locked: function locked() {
				return !!_locked;
			},

			// Call all callbacks with the given context and arguments
			fireWith: function fireWith(context, args) {
				if (!_locked) {
					args = args || [];
					args = [context, args.slice ? args.slice() : args];
					queue.push(args);
					if (!firing) {
						fire();
					}
				}
				return this;
			},

			// Call all the callbacks with the given arguments
			fire: function fire() {
				self.fireWith(this, arguments);
				return this;
			},

			// To know if the callbacks have already been called at least once
			fired: function fired() {
				return !!_fired;
			}
		};

		return self;
	};

	function Identity(v) {
		return v;
	}
	function Thrower(ex) {
		throw ex;
	}

	function adoptValue(value, resolve, reject, noValue) {
		var method;

		try {

			// Check for promise aspect first to privilege synchronous behavior
			if (value && jQuery.isFunction(method = value.promise)) {
				method.call(value).done(resolve).fail(reject);

				// Other thenables
			} else if (value && jQuery.isFunction(method = value.then)) {
				method.call(value, resolve, reject);

				// Other non-thenables
			} else {

				// Control `resolve` arguments by letting Array#slice cast boolean `noValue` to integer:
				// * false: [ value ].slice( 0 ) => resolve( value )
				// * true: [ value ].slice( 1 ) => resolve()
				resolve.apply(undefined, [value].slice(noValue));
			}

			// For Promises/A+, convert exceptions into rejections
			// Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
			// Deferred#then to conditionally suppress rejection.
		} catch (value) {

			// Support: Android 4.0 only
			// Strict mode functions invoked without .call/.apply get global-object context
			reject.apply(undefined, [value]);
		}
	}

	jQuery.extend({

		Deferred: function Deferred(func) {
			var tuples = [

			// action, add listener, callbacks,
			// ... .then handlers, argument index, [final state]
			["notify", "progress", jQuery.Callbacks("memory"), jQuery.Callbacks("memory"), 2], ["resolve", "done", jQuery.Callbacks("once memory"), jQuery.Callbacks("once memory"), 0, "resolved"], ["reject", "fail", jQuery.Callbacks("once memory"), jQuery.Callbacks("once memory"), 1, "rejected"]],
			    _state = "pending",
			    _promise = {
				state: function state() {
					return _state;
				},
				always: function always() {
					deferred.done(arguments).fail(arguments);
					return this;
				},
				"catch": function _catch(fn) {
					return _promise.then(null, fn);
				},

				// Keep pipe for back-compat
				pipe: function pipe() /* fnDone, fnFail, fnProgress */{
					var fns = arguments;

					return jQuery.Deferred(function (newDefer) {
						jQuery.each(tuples, function (i, tuple) {

							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
							var fn = jQuery.isFunction(fns[tuple[4]]) && fns[tuple[4]];

							// deferred.progress(function() { bind to newDefer or newDefer.notify })
							// deferred.done(function() { bind to newDefer or newDefer.resolve })
							// deferred.fail(function() { bind to newDefer or newDefer.reject })
							deferred[tuple[1]](function () {
								var returned = fn && fn.apply(this, arguments);
								if (returned && jQuery.isFunction(returned.promise)) {
									returned.promise().progress(newDefer.notify).done(newDefer.resolve).fail(newDefer.reject);
								} else {
									newDefer[tuple[0] + "With"](this, fn ? [returned] : arguments);
								}
							});
						});
						fns = null;
					}).promise();
				},
				then: function then(onFulfilled, onRejected, onProgress) {
					var maxDepth = 0;
					function resolve(depth, deferred, handler, special) {
						return function () {
							var that = this,
							    args = arguments,
							    mightThrow = function mightThrow() {
								var returned, then;

								// Support: Promises/A+ section 2.3.3.3.3
								// https://promisesaplus.com/#point-59
								// Ignore double-resolution attempts
								if (depth < maxDepth) {
									return;
								}

								returned = handler.apply(that, args);

								// Support: Promises/A+ section 2.3.1
								// https://promisesaplus.com/#point-48
								if (returned === deferred.promise()) {
									throw new TypeError("Thenable self-resolution");
								}

								// Support: Promises/A+ sections 2.3.3.1, 3.5
								// https://promisesaplus.com/#point-54
								// https://promisesaplus.com/#point-75
								// Retrieve `then` only once
								then = returned && (

								// Support: Promises/A+ section 2.3.4
								// https://promisesaplus.com/#point-64
								// Only check objects and functions for thenability
								typeof returned === "object" || typeof returned === "function") && returned.then;

								// Handle a returned thenable
								if (jQuery.isFunction(then)) {

									// Special processors (notify) just wait for resolution
									if (special) {
										then.call(returned, resolve(maxDepth, deferred, Identity, special), resolve(maxDepth, deferred, Thrower, special));

										// Normal processors (resolve) also hook into progress
									} else {

										// ...and disregard older resolution values
										maxDepth++;

										then.call(returned, resolve(maxDepth, deferred, Identity, special), resolve(maxDepth, deferred, Thrower, special), resolve(maxDepth, deferred, Identity, deferred.notifyWith));
									}

									// Handle all other returned values
								} else {

									// Only substitute handlers pass on context
									// and multiple values (non-spec behavior)
									if (handler !== Identity) {
										that = undefined;
										args = [returned];
									}

									// Process the value(s)
									// Default process is resolve
									(special || deferred.resolveWith)(that, args);
								}
							},


							// Only normal processors (resolve) catch and reject exceptions
							process = special ? mightThrow : function () {
								try {
									mightThrow();
								} catch (e) {

									if (jQuery.Deferred.exceptionHook) {
										jQuery.Deferred.exceptionHook(e, process.stackTrace);
									}

									// Support: Promises/A+ section 2.3.3.3.4.1
									// https://promisesaplus.com/#point-61
									// Ignore post-resolution exceptions
									if (depth + 1 >= maxDepth) {

										// Only substitute handlers pass on context
										// and multiple values (non-spec behavior)
										if (handler !== Thrower) {
											that = undefined;
											args = [e];
										}

										deferred.rejectWith(that, args);
									}
								}
							};

							// Support: Promises/A+ section 2.3.3.3.1
							// https://promisesaplus.com/#point-57
							// Re-resolve promises immediately to dodge false rejection from
							// subsequent errors
							if (depth) {
								process();
							} else {

								// Call an optional hook to record the stack, in case of exception
								// since it's otherwise lost when execution goes async
								if (jQuery.Deferred.getStackHook) {
									process.stackTrace = jQuery.Deferred.getStackHook();
								}
								window.setTimeout(process);
							}
						};
					}

					return jQuery.Deferred(function (newDefer) {

						// progress_handlers.add( ... )
						tuples[0][3].add(resolve(0, newDefer, jQuery.isFunction(onProgress) ? onProgress : Identity, newDefer.notifyWith));

						// fulfilled_handlers.add( ... )
						tuples[1][3].add(resolve(0, newDefer, jQuery.isFunction(onFulfilled) ? onFulfilled : Identity));

						// rejected_handlers.add( ... )
						tuples[2][3].add(resolve(0, newDefer, jQuery.isFunction(onRejected) ? onRejected : Thrower));
					}).promise();
				},

				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function promise(obj) {
					return obj != null ? jQuery.extend(obj, _promise) : _promise;
				}
			},
			    deferred = {};

			// Add list-specific methods
			jQuery.each(tuples, function (i, tuple) {
				var list = tuple[2],
				    stateString = tuple[5];

				// promise.progress = list.add
				// promise.done = list.add
				// promise.fail = list.add
				_promise[tuple[1]] = list.add;

				// Handle state
				if (stateString) {
					list.add(function () {

						// state = "resolved" (i.e., fulfilled)
						// state = "rejected"
						_state = stateString;
					},

					// rejected_callbacks.disable
					// fulfilled_callbacks.disable
					tuples[3 - i][2].disable,

					// progress_callbacks.lock
					tuples[0][2].lock);
				}

				// progress_handlers.fire
				// fulfilled_handlers.fire
				// rejected_handlers.fire
				list.add(tuple[3].fire);

				// deferred.notify = function() { deferred.notifyWith(...) }
				// deferred.resolve = function() { deferred.resolveWith(...) }
				// deferred.reject = function() { deferred.rejectWith(...) }
				deferred[tuple[0]] = function () {
					deferred[tuple[0] + "With"](this === deferred ? undefined : this, arguments);
					return this;
				};

				// deferred.notifyWith = list.fireWith
				// deferred.resolveWith = list.fireWith
				// deferred.rejectWith = list.fireWith
				deferred[tuple[0] + "With"] = list.fireWith;
			});

			// Make the deferred a promise
			_promise.promise(deferred);

			// Call given func if any
			if (func) {
				func.call(deferred, deferred);
			}

			// All done!
			return deferred;
		},

		// Deferred helper
		when: function when(singleValue) {
			var

			// count of uncompleted subordinates
			remaining = arguments.length,


			// count of unprocessed arguments
			i = remaining,


			// subordinate fulfillment data
			resolveContexts = Array(i),
			    resolveValues = _slice.call(arguments),


			// the master Deferred
			master = jQuery.Deferred(),


			// subordinate callback factory
			updateFunc = function updateFunc(i) {
				return function (value) {
					resolveContexts[i] = this;
					resolveValues[i] = arguments.length > 1 ? _slice.call(arguments) : value;
					if (! --remaining) {
						master.resolveWith(resolveContexts, resolveValues);
					}
				};
			};

			// Single- and empty arguments are adopted like Promise.resolve
			if (remaining <= 1) {
				adoptValue(singleValue, master.done(updateFunc(i)).resolve, master.reject, !remaining);

				// Use .then() to unwrap secondary thenables (cf. gh-3000)
				if (master.state() === "pending" || jQuery.isFunction(resolveValues[i] && resolveValues[i].then)) {

					return master.then();
				}
			}

			// Multiple arguments are aggregated like Promise.all array elements
			while (i--) {
				adoptValue(resolveValues[i], updateFunc(i), master.reject);
			}

			return master.promise();
		}
	});

	// These usually indicate a programmer mistake during development,
	// warn about them ASAP rather than swallowing them by default.
	var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

	jQuery.Deferred.exceptionHook = function (error, stack) {

		// Support: IE 8 - 9 only
		// Console exists when dev tools are open, which can happen at any time
		if (window.console && window.console.warn && error && rerrorNames.test(error.name)) {
			window.console.warn("jQuery.Deferred exception: " + error.message, error.stack, stack);
		}
	};

	jQuery.readyException = function (error) {
		window.setTimeout(function () {
			throw error;
		});
	};

	// The deferred used on DOM ready
	var readyList = jQuery.Deferred();

	jQuery.fn.ready = function (fn) {

		readyList.then(fn)

		// Wrap jQuery.readyException in a function so that the lookup
		// happens at the time of error handling instead of callback
		// registration.
		.catch(function (error) {
			jQuery.readyException(error);
		});

		return this;
	};

	jQuery.extend({

		// Is the DOM ready to be used? Set to true once it occurs.
		isReady: false,

		// A counter to track how many items to wait for before
		// the ready event fires. See #6781
		readyWait: 1,

		// Handle when the DOM is ready
		ready: function ready(wait) {

			// Abort if there are pending holds or we're already ready
			if (wait === true ? --jQuery.readyWait : jQuery.isReady) {
				return;
			}

			// Remember that the DOM is ready
			jQuery.isReady = true;

			// If a normal DOM Ready event fired, decrement, and wait if need be
			if (wait !== true && --jQuery.readyWait > 0) {
				return;
			}

			// If there are functions bound, to execute
			readyList.resolveWith(document, [jQuery]);
		}
	});

	jQuery.ready.then = readyList.then;

	// The ready event handler and self cleanup method
	function completed() {
		document.removeEventListener("DOMContentLoaded", completed);
		window.removeEventListener("load", completed);
		jQuery.ready();
	}

	// Catch cases where $(document).ready() is called
	// after the browser event has already occurred.
	// Support: IE <=9 - 10 only
	// Older IE sometimes signals "interactive" too soon
	if (document.readyState === "complete" || document.readyState !== "loading" && !document.documentElement.doScroll) {

		// Handle it asynchronously to allow scripts the opportunity to delay ready
		window.setTimeout(jQuery.ready);
	} else {

		// Use the handy event callback
		document.addEventListener("DOMContentLoaded", completed);

		// A fallback to window.onload, that will always work
		window.addEventListener("load", completed);
	}

	// Multifunctional method to get and set values of a collection
	// The value/s can optionally be executed if it's a function
	var access = function access(elems, fn, key, value, chainable, emptyGet, raw) {
		var i = 0,
		    len = elems.length,
		    bulk = key == null;

		// Sets many values
		if (jQuery.type(key) === "object") {
			chainable = true;
			for (i in key) {
				access(elems, fn, i, key[i], true, emptyGet, raw);
			}

			// Sets one value
		} else if (value !== undefined) {
			chainable = true;

			if (!jQuery.isFunction(value)) {
				raw = true;
			}

			if (bulk) {

				// Bulk operations run against the entire set
				if (raw) {
					fn.call(elems, value);
					fn = null;

					// ...except when executing function values
				} else {
					bulk = fn;
					fn = function fn(elem, key, value) {
						return bulk.call(jQuery(elem), value);
					};
				}
			}

			if (fn) {
				for (; i < len; i++) {
					fn(elems[i], key, raw ? value : value.call(elems[i], i, fn(elems[i], key)));
				}
			}
		}

		if (chainable) {
			return elems;
		}

		// Gets
		if (bulk) {
			return fn.call(elems);
		}

		return len ? fn(elems[0], key) : emptyGet;
	};
	var acceptData = function acceptData(owner) {

		// Accepts only:
		//  - Node
		//    - Node.ELEMENT_NODE
		//    - Node.DOCUMENT_NODE
		//  - Object
		//    - Any
		return owner.nodeType === 1 || owner.nodeType === 9 || !+owner.nodeType;
	};

	function Data() {
		this.expando = jQuery.expando + Data.uid++;
	}

	Data.uid = 1;

	Data.prototype = {

		cache: function cache(owner) {

			// Check if the owner object already has a cache
			var value = owner[this.expando];

			// If not, create one
			if (!value) {
				value = {};

				// We can accept data for non-element nodes in modern browsers,
				// but we should not, see #8335.
				// Always return an empty object.
				if (acceptData(owner)) {

					// If it is a node unlikely to be stringify-ed or looped over
					// use plain assignment
					if (owner.nodeType) {
						owner[this.expando] = value;

						// Otherwise secure it in a non-enumerable property
						// configurable must be true to allow the property to be
						// deleted when data is removed
					} else {
						Object.defineProperty(owner, this.expando, {
							value: value,
							configurable: true
						});
					}
				}
			}

			return value;
		},
		set: function set(owner, data, value) {
			var prop,
			    cache = this.cache(owner);

			// Handle: [ owner, key, value ] args
			// Always use camelCase key (gh-2257)
			if (typeof data === "string") {
				cache[jQuery.camelCase(data)] = value;

				// Handle: [ owner, { properties } ] args
			} else {

				// Copy the properties one-by-one to the cache object
				for (prop in data) {
					cache[jQuery.camelCase(prop)] = data[prop];
				}
			}
			return cache;
		},
		get: function get(owner, key) {
			return key === undefined ? this.cache(owner) :

			// Always use camelCase key (gh-2257)
			owner[this.expando] && owner[this.expando][jQuery.camelCase(key)];
		},
		access: function access(owner, key, value) {

			// In cases where either:
			//
			//   1. No key was specified
			//   2. A string key was specified, but no value provided
			//
			// Take the "read" path and allow the get method to determine
			// which value to return, respectively either:
			//
			//   1. The entire cache object
			//   2. The data stored at the key
			//
			if (key === undefined || key && typeof key === "string" && value === undefined) {

				return this.get(owner, key);
			}

			// When the key is not a string, or both a key and value
			// are specified, set or extend (existing objects) with either:
			//
			//   1. An object of properties
			//   2. A key and value
			//
			this.set(owner, key, value);

			// Since the "set" path can have two possible entry points
			// return the expected data based on which path was taken[*]
			return value !== undefined ? value : key;
		},
		remove: function remove(owner, key) {
			var i,
			    cache = owner[this.expando];

			if (cache === undefined) {
				return;
			}

			if (key !== undefined) {

				// Support array or space separated string of keys
				if (Array.isArray(key)) {

					// If key is an array of keys...
					// We always set camelCase keys, so remove that.
					key = key.map(jQuery.camelCase);
				} else {
					key = jQuery.camelCase(key);

					// If a key with the spaces exists, use it.
					// Otherwise, create an array by matching non-whitespace
					key = key in cache ? [key] : key.match(rnothtmlwhite) || [];
				}

				i = key.length;

				while (i--) {
					delete cache[key[i]];
				}
			}

			// Remove the expando if there's no more data
			if (key === undefined || jQuery.isEmptyObject(cache)) {

				// Support: Chrome <=35 - 45
				// Webkit & Blink performance suffers when deleting properties
				// from DOM nodes, so set to undefined instead
				// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
				if (owner.nodeType) {
					owner[this.expando] = undefined;
				} else {
					delete owner[this.expando];
				}
			}
		},
		hasData: function hasData(owner) {
			var cache = owner[this.expando];
			return cache !== undefined && !jQuery.isEmptyObject(cache);
		}
	};
	var dataPriv = new Data();

	var dataUser = new Data();

	//	Implementation Summary
	//
	//	1. Enforce API surface and semantic compatibility with 1.9.x branch
	//	2. Improve the module's maintainability by reducing the storage
	//		paths to a single mechanism.
	//	3. Use the same single mechanism to support "private" and "user" data.
	//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
	//	5. Avoid exposing implementation details on user objects (eg. expando properties)
	//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

	var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	    rmultiDash = /[A-Z]/g;

	function getData(data) {
		if (data === "true") {
			return true;
		}

		if (data === "false") {
			return false;
		}

		if (data === "null") {
			return null;
		}

		// Only convert to a number if it doesn't change the string
		if (data === +data + "") {
			return +data;
		}

		if (rbrace.test(data)) {
			return JSON.parse(data);
		}

		return data;
	}

	function dataAttr(elem, key, data) {
		var name;

		// If nothing was found internally, try to fetch any
		// data from the HTML5 data-* attribute
		if (data === undefined && elem.nodeType === 1) {
			name = "data-" + key.replace(rmultiDash, "-$&").toLowerCase();
			data = elem.getAttribute(name);

			if (typeof data === "string") {
				try {
					data = getData(data);
				} catch (e) {}

				// Make sure we set the data so it isn't changed later
				dataUser.set(elem, key, data);
			} else {
				data = undefined;
			}
		}
		return data;
	}

	jQuery.extend({
		hasData: function hasData(elem) {
			return dataUser.hasData(elem) || dataPriv.hasData(elem);
		},

		data: function data(elem, name, _data) {
			return dataUser.access(elem, name, _data);
		},

		removeData: function removeData(elem, name) {
			dataUser.remove(elem, name);
		},

		// TODO: Now that all calls to _data and _removeData have been replaced
		// with direct calls to dataPriv methods, these can be deprecated.
		_data: function _data(elem, name, data) {
			return dataPriv.access(elem, name, data);
		},

		_removeData: function _removeData(elem, name) {
			dataPriv.remove(elem, name);
		}
	});

	jQuery.fn.extend({
		data: function data(key, value) {
			var i,
			    name,
			    data,
			    elem = this[0],
			    attrs = elem && elem.attributes;

			// Gets all values
			if (key === undefined) {
				if (this.length) {
					data = dataUser.get(elem);

					if (elem.nodeType === 1 && !dataPriv.get(elem, "hasDataAttrs")) {
						i = attrs.length;
						while (i--) {

							// Support: IE 11 only
							// The attrs elements can be null (#14894)
							if (attrs[i]) {
								name = attrs[i].name;
								if (name.indexOf("data-") === 0) {
									name = jQuery.camelCase(name.slice(5));
									dataAttr(elem, name, data[name]);
								}
							}
						}
						dataPriv.set(elem, "hasDataAttrs", true);
					}
				}

				return data;
			}

			// Sets multiple values
			if (typeof key === "object") {
				return this.each(function () {
					dataUser.set(this, key);
				});
			}

			return access(this, function (value) {
				var data;

				// The calling jQuery object (element matches) is not empty
				// (and therefore has an element appears at this[ 0 ]) and the
				// `value` parameter was not undefined. An empty jQuery object
				// will result in `undefined` for elem = this[ 0 ] which will
				// throw an exception if an attempt to read a data cache is made.
				if (elem && value === undefined) {

					// Attempt to get data from the cache
					// The key will always be camelCased in Data
					data = dataUser.get(elem, key);
					if (data !== undefined) {
						return data;
					}

					// Attempt to "discover" the data in
					// HTML5 custom data-* attrs
					data = dataAttr(elem, key);
					if (data !== undefined) {
						return data;
					}

					// We tried really hard, but the data doesn't exist.
					return;
				}

				// Set the data...
				this.each(function () {

					// We always store the camelCased key
					dataUser.set(this, key, value);
				});
			}, null, value, arguments.length > 1, null, true);
		},

		removeData: function removeData(key) {
			return this.each(function () {
				dataUser.remove(this, key);
			});
		}
	});

	jQuery.extend({
		queue: function queue(elem, type, data) {
			var queue;

			if (elem) {
				type = (type || "fx") + "queue";
				queue = dataPriv.get(elem, type);

				// Speed up dequeue by getting out quickly if this is just a lookup
				if (data) {
					if (!queue || Array.isArray(data)) {
						queue = dataPriv.access(elem, type, jQuery.makeArray(data));
					} else {
						queue.push(data);
					}
				}
				return queue || [];
			}
		},

		dequeue: function dequeue(elem, type) {
			type = type || "fx";

			var queue = jQuery.queue(elem, type),
			    startLength = queue.length,
			    fn = queue.shift(),
			    hooks = jQuery._queueHooks(elem, type),
			    next = function next() {
				jQuery.dequeue(elem, type);
			};

			// If the fx queue is dequeued, always remove the progress sentinel
			if (fn === "inprogress") {
				fn = queue.shift();
				startLength--;
			}

			if (fn) {

				// Add a progress sentinel to prevent the fx queue from being
				// automatically dequeued
				if (type === "fx") {
					queue.unshift("inprogress");
				}

				// Clear up the last queue stop function
				delete hooks.stop;
				fn.call(elem, next, hooks);
			}

			if (!startLength && hooks) {
				hooks.empty.fire();
			}
		},

		// Not public - generate a queueHooks object, or return the current one
		_queueHooks: function _queueHooks(elem, type) {
			var key = type + "queueHooks";
			return dataPriv.get(elem, key) || dataPriv.access(elem, key, {
				empty: jQuery.Callbacks("once memory").add(function () {
					dataPriv.remove(elem, [type + "queue", key]);
				})
			});
		}
	});

	jQuery.fn.extend({
		queue: function queue(type, data) {
			var setter = 2;

			if (typeof type !== "string") {
				data = type;
				type = "fx";
				setter--;
			}

			if (arguments.length < setter) {
				return jQuery.queue(this[0], type);
			}

			return data === undefined ? this : this.each(function () {
				var queue = jQuery.queue(this, type, data);

				// Ensure a hooks for this queue
				jQuery._queueHooks(this, type);

				if (type === "fx" && queue[0] !== "inprogress") {
					jQuery.dequeue(this, type);
				}
			});
		},
		dequeue: function dequeue(type) {
			return this.each(function () {
				jQuery.dequeue(this, type);
			});
		},
		clearQueue: function clearQueue(type) {
			return this.queue(type || "fx", []);
		},

		// Get a promise resolved when queues of a certain type
		// are emptied (fx is the type by default)
		promise: function promise(type, obj) {
			var tmp,
			    count = 1,
			    defer = jQuery.Deferred(),
			    elements = this,
			    i = this.length,
			    resolve = function resolve() {
				if (! --count) {
					defer.resolveWith(elements, [elements]);
				}
			};

			if (typeof type !== "string") {
				obj = type;
				type = undefined;
			}
			type = type || "fx";

			while (i--) {
				tmp = dataPriv.get(elements[i], type + "queueHooks");
				if (tmp && tmp.empty) {
					count++;
					tmp.empty.add(resolve);
				}
			}
			resolve();
			return defer.promise(obj);
		}
	});
	var pnum = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source;

	var rcssNum = new RegExp("^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i");

	var cssExpand = ["Top", "Right", "Bottom", "Left"];

	var isHiddenWithinTree = function isHiddenWithinTree(elem, el) {

		// isHiddenWithinTree might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;

		// Inline style trumps all
		return elem.style.display === "none" || elem.style.display === "" &&

		// Otherwise, check computed style
		// Support: Firefox <=43 - 45
		// Disconnected elements can have computed display: none, so first confirm that elem is
		// in the document.
		jQuery.contains(elem.ownerDocument, elem) && jQuery.css(elem, "display") === "none";
	};

	var swap = function swap(elem, options, callback, args) {
		var ret,
		    name,
		    old = {};

		// Remember the old values, and insert the new ones
		for (name in options) {
			old[name] = elem.style[name];
			elem.style[name] = options[name];
		}

		ret = callback.apply(elem, args || []);

		// Revert the old values
		for (name in options) {
			elem.style[name] = old[name];
		}

		return ret;
	};

	function adjustCSS(elem, prop, valueParts, tween) {
		var adjusted,
		    scale = 1,
		    maxIterations = 20,
		    currentValue = tween ? function () {
			return tween.cur();
		} : function () {
			return jQuery.css(elem, prop, "");
		},
		    initial = currentValue(),
		    unit = valueParts && valueParts[3] || (jQuery.cssNumber[prop] ? "" : "px"),


		// Starting value computation is required for potential unit mismatches
		initialInUnit = (jQuery.cssNumber[prop] || unit !== "px" && +initial) && rcssNum.exec(jQuery.css(elem, prop));

		if (initialInUnit && initialInUnit[3] !== unit) {

			// Trust units reported by jQuery.css
			unit = unit || initialInUnit[3];

			// Make sure we update the tween properties later on
			valueParts = valueParts || [];

			// Iteratively approximate from a nonzero starting point
			initialInUnit = +initial || 1;

			do {

				// If previous iteration zeroed out, double until we get *something*.
				// Use string for doubling so we don't accidentally see scale as unchanged below
				scale = scale || ".5";

				// Adjust and apply
				initialInUnit = initialInUnit / scale;
				jQuery.style(elem, prop, initialInUnit + unit);

				// Update scale, tolerating zero or NaN from tween.cur()
				// Break the loop if scale is unchanged or perfect, or if we've just had enough.
			} while (scale !== (scale = currentValue() / initial) && scale !== 1 && --maxIterations);
		}

		if (valueParts) {
			initialInUnit = +initialInUnit || +initial || 0;

			// Apply relative offset (+=/-=) if specified
			adjusted = valueParts[1] ? initialInUnit + (valueParts[1] + 1) * valueParts[2] : +valueParts[2];
			if (tween) {
				tween.unit = unit;
				tween.start = initialInUnit;
				tween.end = adjusted;
			}
		}
		return adjusted;
	}

	var defaultDisplayMap = {};

	function getDefaultDisplay(elem) {
		var temp,
		    doc = elem.ownerDocument,
		    nodeName = elem.nodeName,
		    display = defaultDisplayMap[nodeName];

		if (display) {
			return display;
		}

		temp = doc.body.appendChild(doc.createElement(nodeName));
		display = jQuery.css(temp, "display");

		temp.parentNode.removeChild(temp);

		if (display === "none") {
			display = "block";
		}
		defaultDisplayMap[nodeName] = display;

		return display;
	}

	function showHide(elements, show) {
		var display,
		    elem,
		    values = [],
		    index = 0,
		    length = elements.length;

		// Determine new display value for elements that need to change
		for (; index < length; index++) {
			elem = elements[index];
			if (!elem.style) {
				continue;
			}

			display = elem.style.display;
			if (show) {

				// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
				// check is required in this first loop unless we have a nonempty display value (either
				// inline or about-to-be-restored)
				if (display === "none") {
					values[index] = dataPriv.get(elem, "display") || null;
					if (!values[index]) {
						elem.style.display = "";
					}
				}
				if (elem.style.display === "" && isHiddenWithinTree(elem)) {
					values[index] = getDefaultDisplay(elem);
				}
			} else {
				if (display !== "none") {
					values[index] = "none";

					// Remember what we're overwriting
					dataPriv.set(elem, "display", display);
				}
			}
		}

		// Set the display of the elements in a second loop to avoid constant reflow
		for (index = 0; index < length; index++) {
			if (values[index] != null) {
				elements[index].style.display = values[index];
			}
		}

		return elements;
	}

	jQuery.fn.extend({
		show: function show() {
			return showHide(this, true);
		},
		hide: function hide() {
			return showHide(this);
		},
		toggle: function toggle(state) {
			if (typeof state === "boolean") {
				return state ? this.show() : this.hide();
			}

			return this.each(function () {
				if (isHiddenWithinTree(this)) {
					jQuery(this).show();
				} else {
					jQuery(this).hide();
				}
			});
		}
	});
	var rcheckableType = /^(?:checkbox|radio)$/i;

	var rtagName = /<([a-z][^\/\0>\x20\t\r\n\f]+)/i;

	var rscriptType = /^$|\/(?:java|ecma)script/i;

	// We have to close these tags to support XHTML (#13200)
	var wrapMap = {

		// Support: IE <=9 only
		option: [1, "<select multiple='multiple'>", "</select>"],

		// XHTML parsers do not magically insert elements in the
		// same way that tag soup parsers do. So we cannot shorten
		// this by omitting <tbody> or other required elements.
		thead: [1, "<table>", "</table>"],
		col: [2, "<table><colgroup>", "</colgroup></table>"],
		tr: [2, "<table><tbody>", "</tbody></table>"],
		td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],

		_default: [0, "", ""]
	};

	// Support: IE <=9 only
	wrapMap.optgroup = wrapMap.option;

	wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
	wrapMap.th = wrapMap.td;

	function getAll(context, tag) {

		// Support: IE <=9 - 11 only
		// Use typeof to avoid zero-argument method invocation on host objects (#15151)
		var ret;

		if (typeof context.getElementsByTagName !== "undefined") {
			ret = context.getElementsByTagName(tag || "*");
		} else if (typeof context.querySelectorAll !== "undefined") {
			ret = context.querySelectorAll(tag || "*");
		} else {
			ret = [];
		}

		if (tag === undefined || tag && nodeName(context, tag)) {
			return jQuery.merge([context], ret);
		}

		return ret;
	}

	// Mark scripts as having already been evaluated
	function setGlobalEval(elems, refElements) {
		var i = 0,
		    l = elems.length;

		for (; i < l; i++) {
			dataPriv.set(elems[i], "globalEval", !refElements || dataPriv.get(refElements[i], "globalEval"));
		}
	}

	var rhtml = /<|&#?\w+;/;

	function buildFragment(elems, context, scripts, selection, ignored) {
		var elem,
		    tmp,
		    tag,
		    wrap,
		    contains,
		    j,
		    fragment = context.createDocumentFragment(),
		    nodes = [],
		    i = 0,
		    l = elems.length;

		for (; i < l; i++) {
			elem = elems[i];

			if (elem || elem === 0) {

				// Add nodes directly
				if (jQuery.type(elem) === "object") {

					// Support: Android <=4.0 only, PhantomJS 1 only
					// push.apply(_, arraylike) throws on ancient WebKit
					jQuery.merge(nodes, elem.nodeType ? [elem] : elem);

					// Convert non-html into a text node
				} else if (!rhtml.test(elem)) {
					nodes.push(context.createTextNode(elem));

					// Convert html into DOM nodes
				} else {
					tmp = tmp || fragment.appendChild(context.createElement("div"));

					// Deserialize a standard representation
					tag = (rtagName.exec(elem) || ["", ""])[1].toLowerCase();
					wrap = wrapMap[tag] || wrapMap._default;
					tmp.innerHTML = wrap[1] + jQuery.htmlPrefilter(elem) + wrap[2];

					// Descend through wrappers to the right content
					j = wrap[0];
					while (j--) {
						tmp = tmp.lastChild;
					}

					// Support: Android <=4.0 only, PhantomJS 1 only
					// push.apply(_, arraylike) throws on ancient WebKit
					jQuery.merge(nodes, tmp.childNodes);

					// Remember the top-level container
					tmp = fragment.firstChild;

					// Ensure the created nodes are orphaned (#12392)
					tmp.textContent = "";
				}
			}
		}

		// Remove wrapper from fragment
		fragment.textContent = "";

		i = 0;
		while (elem = nodes[i++]) {

			// Skip elements already in the context collection (trac-4087)
			if (selection && jQuery.inArray(elem, selection) > -1) {
				if (ignored) {
					ignored.push(elem);
				}
				continue;
			}

			contains = jQuery.contains(elem.ownerDocument, elem);

			// Append to fragment
			tmp = getAll(fragment.appendChild(elem), "script");

			// Preserve script evaluation history
			if (contains) {
				setGlobalEval(tmp);
			}

			// Capture executables
			if (scripts) {
				j = 0;
				while (elem = tmp[j++]) {
					if (rscriptType.test(elem.type || "")) {
						scripts.push(elem);
					}
				}
			}
		}

		return fragment;
	}

	(function () {
		var fragment = document.createDocumentFragment(),
		    div = fragment.appendChild(document.createElement("div")),
		    input = document.createElement("input");

		// Support: Android 4.0 - 4.3 only
		// Check state lost if the name is set (#11217)
		// Support: Windows Web Apps (WWA)
		// `name` and `type` must use .setAttribute for WWA (#14901)
		input.setAttribute("type", "radio");
		input.setAttribute("checked", "checked");
		input.setAttribute("name", "t");

		div.appendChild(input);

		// Support: Android <=4.1 only
		// Older WebKit doesn't clone checked state correctly in fragments
		support.checkClone = div.cloneNode(true).cloneNode(true).lastChild.checked;

		// Support: IE <=11 only
		// Make sure textarea (and checkbox) defaultValue is properly cloned
		div.innerHTML = "<textarea>x</textarea>";
		support.noCloneChecked = !!div.cloneNode(true).lastChild.defaultValue;
	})();
	var documentElement = document.documentElement;

	var rkeyEvent = /^key/,
	    rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
	    rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

	function returnTrue() {
		return true;
	}

	function returnFalse() {
		return false;
	}

	// Support: IE <=9 only
	// See #13393 for more info
	function safeActiveElement() {
		try {
			return document.activeElement;
		} catch (err) {}
	}

	function _on(elem, types, selector, data, fn, one) {
		var origFn, type;

		// Types can be a map of types/handlers
		if (typeof types === "object") {

			// ( types-Object, selector, data )
			if (typeof selector !== "string") {

				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for (type in types) {
				_on(elem, type, selector, data, types[type], one);
			}
			return elem;
		}

		if (data == null && fn == null) {

			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if (fn == null) {
			if (typeof selector === "string") {

				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {

				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if (fn === false) {
			fn = returnFalse;
		} else if (!fn) {
			return elem;
		}

		if (one === 1) {
			origFn = fn;
			fn = function fn(event) {

				// Can use an empty set, since event contains the info
				jQuery().off(event);
				return origFn.apply(this, arguments);
			};

			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || (origFn.guid = jQuery.guid++);
		}
		return elem.each(function () {
			jQuery.event.add(this, types, fn, data, selector);
		});
	}

	/*
  * Helper functions for managing events -- not part of the public interface.
  * Props to Dean Edwards' addEvent library for many of the ideas.
  */
	jQuery.event = {

		global: {},

		add: function add(elem, types, handler, data, selector) {

			var handleObjIn,
			    eventHandle,
			    tmp,
			    events,
			    t,
			    handleObj,
			    special,
			    handlers,
			    type,
			    namespaces,
			    origType,
			    elemData = dataPriv.get(elem);

			// Don't attach events to noData or text/comment nodes (but allow plain objects)
			if (!elemData) {
				return;
			}

			// Caller can pass in an object of custom data in lieu of the handler
			if (handler.handler) {
				handleObjIn = handler;
				handler = handleObjIn.handler;
				selector = handleObjIn.selector;
			}

			// Ensure that invalid selectors throw exceptions at attach time
			// Evaluate against documentElement in case elem is a non-element node (e.g., document)
			if (selector) {
				jQuery.find.matchesSelector(documentElement, selector);
			}

			// Make sure that the handler has a unique ID, used to find/remove it later
			if (!handler.guid) {
				handler.guid = jQuery.guid++;
			}

			// Init the element's event structure and main handler, if this is the first
			if (!(events = elemData.events)) {
				events = elemData.events = {};
			}
			if (!(eventHandle = elemData.handle)) {
				eventHandle = elemData.handle = function (e) {

					// Discard the second event of a jQuery.event.trigger() and
					// when an event is called after a page has unloaded
					return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ? jQuery.event.dispatch.apply(elem, arguments) : undefined;
				};
			}

			// Handle multiple events separated by a space
			types = (types || "").match(rnothtmlwhite) || [""];
			t = types.length;
			while (t--) {
				tmp = rtypenamespace.exec(types[t]) || [];
				type = origType = tmp[1];
				namespaces = (tmp[2] || "").split(".").sort();

				// There *must* be a type, no attaching namespace-only handlers
				if (!type) {
					continue;
				}

				// If event changes its type, use the special event handlers for the changed type
				special = jQuery.event.special[type] || {};

				// If selector defined, determine special event api type, otherwise given type
				type = (selector ? special.delegateType : special.bindType) || type;

				// Update special based on newly reset type
				special = jQuery.event.special[type] || {};

				// handleObj is passed to all event handlers
				handleObj = jQuery.extend({
					type: type,
					origType: origType,
					data: data,
					handler: handler,
					guid: handler.guid,
					selector: selector,
					needsContext: selector && jQuery.expr.match.needsContext.test(selector),
					namespace: namespaces.join(".")
				}, handleObjIn);

				// Init the event handler queue if we're the first
				if (!(handlers = events[type])) {
					handlers = events[type] = [];
					handlers.delegateCount = 0;

					// Only use addEventListener if the special events handler returns false
					if (!special.setup || special.setup.call(elem, data, namespaces, eventHandle) === false) {

						if (elem.addEventListener) {
							elem.addEventListener(type, eventHandle);
						}
					}
				}

				if (special.add) {
					special.add.call(elem, handleObj);

					if (!handleObj.handler.guid) {
						handleObj.handler.guid = handler.guid;
					}
				}

				// Add to the element's handler list, delegates in front
				if (selector) {
					handlers.splice(handlers.delegateCount++, 0, handleObj);
				} else {
					handlers.push(handleObj);
				}

				// Keep track of which events have ever been used, for event optimization
				jQuery.event.global[type] = true;
			}
		},

		// Detach an event or set of events from an element
		remove: function remove(elem, types, handler, selector, mappedTypes) {

			var j,
			    origCount,
			    tmp,
			    events,
			    t,
			    handleObj,
			    special,
			    handlers,
			    type,
			    namespaces,
			    origType,
			    elemData = dataPriv.hasData(elem) && dataPriv.get(elem);

			if (!elemData || !(events = elemData.events)) {
				return;
			}

			// Once for each type.namespace in types; type may be omitted
			types = (types || "").match(rnothtmlwhite) || [""];
			t = types.length;
			while (t--) {
				tmp = rtypenamespace.exec(types[t]) || [];
				type = origType = tmp[1];
				namespaces = (tmp[2] || "").split(".").sort();

				// Unbind all events (on this namespace, if provided) for the element
				if (!type) {
					for (type in events) {
						jQuery.event.remove(elem, type + types[t], handler, selector, true);
					}
					continue;
				}

				special = jQuery.event.special[type] || {};
				type = (selector ? special.delegateType : special.bindType) || type;
				handlers = events[type] || [];
				tmp = tmp[2] && new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)");

				// Remove matching events
				origCount = j = handlers.length;
				while (j--) {
					handleObj = handlers[j];

					if ((mappedTypes || origType === handleObj.origType) && (!handler || handler.guid === handleObj.guid) && (!tmp || tmp.test(handleObj.namespace)) && (!selector || selector === handleObj.selector || selector === "**" && handleObj.selector)) {
						handlers.splice(j, 1);

						if (handleObj.selector) {
							handlers.delegateCount--;
						}
						if (special.remove) {
							special.remove.call(elem, handleObj);
						}
					}
				}

				// Remove generic event handler if we removed something and no more handlers exist
				// (avoids potential for endless recursion during removal of special event handlers)
				if (origCount && !handlers.length) {
					if (!special.teardown || special.teardown.call(elem, namespaces, elemData.handle) === false) {

						jQuery.removeEvent(elem, type, elemData.handle);
					}

					delete events[type];
				}
			}

			// Remove data and the expando if it's no longer used
			if (jQuery.isEmptyObject(events)) {
				dataPriv.remove(elem, "handle events");
			}
		},

		dispatch: function dispatch(nativeEvent) {

			// Make a writable jQuery.Event from the native event object
			var event = jQuery.event.fix(nativeEvent);

			var i,
			    j,
			    ret,
			    matched,
			    handleObj,
			    handlerQueue,
			    args = new Array(arguments.length),
			    handlers = (dataPriv.get(this, "events") || {})[event.type] || [],
			    special = jQuery.event.special[event.type] || {};

			// Use the fix-ed jQuery.Event rather than the (read-only) native event
			args[0] = event;

			for (i = 1; i < arguments.length; i++) {
				args[i] = arguments[i];
			}

			event.delegateTarget = this;

			// Call the preDispatch hook for the mapped type, and let it bail if desired
			if (special.preDispatch && special.preDispatch.call(this, event) === false) {
				return;
			}

			// Determine handlers
			handlerQueue = jQuery.event.handlers.call(this, event, handlers);

			// Run delegates first; they may want to stop propagation beneath us
			i = 0;
			while ((matched = handlerQueue[i++]) && !event.isPropagationStopped()) {
				event.currentTarget = matched.elem;

				j = 0;
				while ((handleObj = matched.handlers[j++]) && !event.isImmediatePropagationStopped()) {

					// Triggered event must either 1) have no namespace, or 2) have namespace(s)
					// a subset or equal to those in the bound event (both can have no namespace).
					if (!event.rnamespace || event.rnamespace.test(handleObj.namespace)) {

						event.handleObj = handleObj;
						event.data = handleObj.data;

						ret = ((jQuery.event.special[handleObj.origType] || {}).handle || handleObj.handler).apply(matched.elem, args);

						if (ret !== undefined) {
							if ((event.result = ret) === false) {
								event.preventDefault();
								event.stopPropagation();
							}
						}
					}
				}
			}

			// Call the postDispatch hook for the mapped type
			if (special.postDispatch) {
				special.postDispatch.call(this, event);
			}

			return event.result;
		},

		handlers: function handlers(event, _handlers) {
			var i,
			    handleObj,
			    sel,
			    matchedHandlers,
			    matchedSelectors,
			    handlerQueue = [],
			    delegateCount = _handlers.delegateCount,
			    cur = event.target;

			// Find delegate handlers
			if (delegateCount &&

			// Support: IE <=9
			// Black-hole SVG <use> instance trees (trac-13180)
			cur.nodeType &&

			// Support: Firefox <=42
			// Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
			// https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
			// Support: IE 11 only
			// ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
			!(event.type === "click" && event.button >= 1)) {

				for (; cur !== this; cur = cur.parentNode || this) {

					// Don't check non-elements (#13208)
					// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
					if (cur.nodeType === 1 && !(event.type === "click" && cur.disabled === true)) {
						matchedHandlers = [];
						matchedSelectors = {};
						for (i = 0; i < delegateCount; i++) {
							handleObj = _handlers[i];

							// Don't conflict with Object.prototype properties (#13203)
							sel = handleObj.selector + " ";

							if (matchedSelectors[sel] === undefined) {
								matchedSelectors[sel] = handleObj.needsContext ? jQuery(sel, this).index(cur) > -1 : jQuery.find(sel, this, null, [cur]).length;
							}
							if (matchedSelectors[sel]) {
								matchedHandlers.push(handleObj);
							}
						}
						if (matchedHandlers.length) {
							handlerQueue.push({ elem: cur, handlers: matchedHandlers });
						}
					}
				}
			}

			// Add the remaining (directly-bound) handlers
			cur = this;
			if (delegateCount < _handlers.length) {
				handlerQueue.push({ elem: cur, handlers: _handlers.slice(delegateCount) });
			}

			return handlerQueue;
		},

		addProp: function addProp(name, hook) {
			Object.defineProperty(jQuery.Event.prototype, name, {
				enumerable: true,
				configurable: true,

				get: jQuery.isFunction(hook) ? function () {
					if (this.originalEvent) {
						return hook(this.originalEvent);
					}
				} : function () {
					if (this.originalEvent) {
						return this.originalEvent[name];
					}
				},

				set: function set(value) {
					Object.defineProperty(this, name, {
						enumerable: true,
						configurable: true,
						writable: true,
						value: value
					});
				}
			});
		},

		fix: function fix(originalEvent) {
			return originalEvent[jQuery.expando] ? originalEvent : new jQuery.Event(originalEvent);
		},

		special: {
			load: {

				// Prevent triggered image.load events from bubbling to window.load
				noBubble: true
			},
			focus: {

				// Fire native event if possible so blur/focus sequence is correct
				trigger: function trigger() {
					if (this !== safeActiveElement() && this.focus) {
						this.focus();
						return false;
					}
				},
				delegateType: "focusin"
			},
			blur: {
				trigger: function trigger() {
					if (this === safeActiveElement() && this.blur) {
						this.blur();
						return false;
					}
				},
				delegateType: "focusout"
			},
			click: {

				// For checkbox, fire native event so checked state will be right
				trigger: function trigger() {
					if (this.type === "checkbox" && this.click && nodeName(this, "input")) {
						this.click();
						return false;
					}
				},

				// For cross-browser consistency, don't fire native .click() on links
				_default: function _default(event) {
					return nodeName(event.target, "a");
				}
			},

			beforeunload: {
				postDispatch: function postDispatch(event) {

					// Support: Firefox 20+
					// Firefox doesn't alert if the returnValue field is not set.
					if (event.result !== undefined && event.originalEvent) {
						event.originalEvent.returnValue = event.result;
					}
				}
			}
		}
	};

	jQuery.removeEvent = function (elem, type, handle) {

		// This "if" is needed for plain objects
		if (elem.removeEventListener) {
			elem.removeEventListener(type, handle);
		}
	};

	jQuery.Event = function (src, props) {

		// Allow instantiation without the 'new' keyword
		if (!(this instanceof jQuery.Event)) {
			return new jQuery.Event(src, props);
		}

		// Event object
		if (src && src.type) {
			this.originalEvent = src;
			this.type = src.type;

			// Events bubbling up the document may have been marked as prevented
			// by a handler lower down the tree; reflect the correct value.
			this.isDefaultPrevented = src.defaultPrevented || src.defaultPrevented === undefined &&

			// Support: Android <=2.3 only
			src.returnValue === false ? returnTrue : returnFalse;

			// Create target properties
			// Support: Safari <=6 - 7 only
			// Target should not be a text node (#504, #13143)
			this.target = src.target && src.target.nodeType === 3 ? src.target.parentNode : src.target;

			this.currentTarget = src.currentTarget;
			this.relatedTarget = src.relatedTarget;

			// Event type
		} else {
			this.type = src;
		}

		// Put explicitly provided properties onto the event object
		if (props) {
			jQuery.extend(this, props);
		}

		// Create a timestamp if incoming event doesn't have one
		this.timeStamp = src && src.timeStamp || jQuery.now();

		// Mark it as fixed
		this[jQuery.expando] = true;
	};

	// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
	// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
	jQuery.Event.prototype = {
		constructor: jQuery.Event,
		isDefaultPrevented: returnFalse,
		isPropagationStopped: returnFalse,
		isImmediatePropagationStopped: returnFalse,
		isSimulated: false,

		preventDefault: function preventDefault() {
			var e = this.originalEvent;

			this.isDefaultPrevented = returnTrue;

			if (e && !this.isSimulated) {
				e.preventDefault();
			}
		},
		stopPropagation: function stopPropagation() {
			var e = this.originalEvent;

			this.isPropagationStopped = returnTrue;

			if (e && !this.isSimulated) {
				e.stopPropagation();
			}
		},
		stopImmediatePropagation: function stopImmediatePropagation() {
			var e = this.originalEvent;

			this.isImmediatePropagationStopped = returnTrue;

			if (e && !this.isSimulated) {
				e.stopImmediatePropagation();
			}

			this.stopPropagation();
		}
	};

	// Includes all common event props including KeyEvent and MouseEvent specific props
	jQuery.each({
		altKey: true,
		bubbles: true,
		cancelable: true,
		changedTouches: true,
		ctrlKey: true,
		detail: true,
		eventPhase: true,
		metaKey: true,
		pageX: true,
		pageY: true,
		shiftKey: true,
		view: true,
		"char": true,
		charCode: true,
		key: true,
		keyCode: true,
		button: true,
		buttons: true,
		clientX: true,
		clientY: true,
		offsetX: true,
		offsetY: true,
		pointerId: true,
		pointerType: true,
		screenX: true,
		screenY: true,
		targetTouches: true,
		toElement: true,
		touches: true,

		which: function which(event) {
			var button = event.button;

			// Add which for key events
			if (event.which == null && rkeyEvent.test(event.type)) {
				return event.charCode != null ? event.charCode : event.keyCode;
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			if (!event.which && button !== undefined && rmouseEvent.test(event.type)) {
				if (button & 1) {
					return 1;
				}

				if (button & 2) {
					return 3;
				}

				if (button & 4) {
					return 2;
				}

				return 0;
			}

			return event.which;
		}
	}, jQuery.event.addProp);

	// Create mouseenter/leave events using mouseover/out and event-time checks
	// so that event delegation works in jQuery.
	// Do the same for pointerenter/pointerleave and pointerover/pointerout
	//
	// Support: Safari 7 only
	// Safari sends mouseenter too often; see:
	// https://bugs.chromium.org/p/chromium/issues/detail?id=470258
	// for the description of the bug (it existed in older Chrome versions as well).
	jQuery.each({
		mouseenter: "mouseover",
		mouseleave: "mouseout",
		pointerenter: "pointerover",
		pointerleave: "pointerout"
	}, function (orig, fix) {
		jQuery.event.special[orig] = {
			delegateType: fix,
			bindType: fix,

			handle: function handle(event) {
				var ret,
				    target = this,
				    related = event.relatedTarget,
				    handleObj = event.handleObj;

				// For mouseenter/leave call the handler if related is outside the target.
				// NB: No relatedTarget if the mouse left/entered the browser window
				if (!related || related !== target && !jQuery.contains(target, related)) {
					event.type = handleObj.origType;
					ret = handleObj.handler.apply(this, arguments);
					event.type = fix;
				}
				return ret;
			}
		};
	});

	jQuery.fn.extend({

		on: function on(types, selector, data, fn) {
			return _on(this, types, selector, data, fn);
		},
		one: function one(types, selector, data, fn) {
			return _on(this, types, selector, data, fn, 1);
		},
		off: function off(types, selector, fn) {
			var handleObj, type;
			if (types && types.preventDefault && types.handleObj) {

				// ( event )  dispatched jQuery.Event
				handleObj = types.handleObj;
				jQuery(types.delegateTarget).off(handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType, handleObj.selector, handleObj.handler);
				return this;
			}
			if (typeof types === "object") {

				// ( types-object [, selector] )
				for (type in types) {
					this.off(type, selector, types[type]);
				}
				return this;
			}
			if (selector === false || typeof selector === "function") {

				// ( types [, fn] )
				fn = selector;
				selector = undefined;
			}
			if (fn === false) {
				fn = returnFalse;
			}
			return this.each(function () {
				jQuery.event.remove(this, types, fn, selector);
			});
		}
	});

	var

	/* eslint-disable max-len */

	// See https://github.com/eslint/eslint/issues/3229
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,


	/* eslint-enable */

	// Support: IE <=10 - 11, Edge 12 - 13
	// In IE/Edge using regex groups here causes severe slowdowns.
	// See https://connect.microsoft.com/IE/feedback/details/1736512/
	rnoInnerhtml = /<script|<style|<link/i,


	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	    rscriptTypeMasked = /^true\/(.*)/,
	    rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

	// Prefer a tbody over its parent table for containing new rows
	function manipulationTarget(elem, content) {
		if (nodeName(elem, "table") && nodeName(content.nodeType !== 11 ? content : content.firstChild, "tr")) {

			return jQuery(">tbody", elem)[0] || elem;
		}

		return elem;
	}

	// Replace/restore the type attribute of script elements for safe DOM manipulation
	function disableScript(elem) {
		elem.type = (elem.getAttribute("type") !== null) + "/" + elem.type;
		return elem;
	}
	function restoreScript(elem) {
		var match = rscriptTypeMasked.exec(elem.type);

		if (match) {
			elem.type = match[1];
		} else {
			elem.removeAttribute("type");
		}

		return elem;
	}

	function cloneCopyEvent(src, dest) {
		var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

		if (dest.nodeType !== 1) {
			return;
		}

		// 1. Copy private data: events, handlers, etc.
		if (dataPriv.hasData(src)) {
			pdataOld = dataPriv.access(src);
			pdataCur = dataPriv.set(dest, pdataOld);
			events = pdataOld.events;

			if (events) {
				delete pdataCur.handle;
				pdataCur.events = {};

				for (type in events) {
					for (i = 0, l = events[type].length; i < l; i++) {
						jQuery.event.add(dest, type, events[type][i]);
					}
				}
			}
		}

		// 2. Copy user data
		if (dataUser.hasData(src)) {
			udataOld = dataUser.access(src);
			udataCur = jQuery.extend({}, udataOld);

			dataUser.set(dest, udataCur);
		}
	}

	// Fix IE bugs, see support tests
	function fixInput(src, dest) {
		var nodeName = dest.nodeName.toLowerCase();

		// Fails to persist the checked state of a cloned checkbox or radio button.
		if (nodeName === "input" && rcheckableType.test(src.type)) {
			dest.checked = src.checked;

			// Fails to return the selected option to the default selected state when cloning options
		} else if (nodeName === "input" || nodeName === "textarea") {
			dest.defaultValue = src.defaultValue;
		}
	}

	function domManip(collection, args, callback, ignored) {

		// Flatten any nested arrays
		args = concat.apply([], args);

		var fragment,
		    first,
		    scripts,
		    hasScripts,
		    node,
		    doc,
		    i = 0,
		    l = collection.length,
		    iNoClone = l - 1,
		    value = args[0],
		    isFunction = jQuery.isFunction(value);

		// We can't cloneNode fragments that contain checked, in WebKit
		if (isFunction || l > 1 && typeof value === "string" && !support.checkClone && rchecked.test(value)) {
			return collection.each(function (index) {
				var self = collection.eq(index);
				if (isFunction) {
					args[0] = value.call(this, index, self.html());
				}
				domManip(self, args, callback, ignored);
			});
		}

		if (l) {
			fragment = buildFragment(args, collection[0].ownerDocument, false, collection, ignored);
			first = fragment.firstChild;

			if (fragment.childNodes.length === 1) {
				fragment = first;
			}

			// Require either new content or an interest in ignored elements to invoke the callback
			if (first || ignored) {
				scripts = jQuery.map(getAll(fragment, "script"), disableScript);
				hasScripts = scripts.length;

				// Use the original fragment for the last item
				// instead of the first because it can end up
				// being emptied incorrectly in certain situations (#8070).
				for (; i < l; i++) {
					node = fragment;

					if (i !== iNoClone) {
						node = jQuery.clone(node, true, true);

						// Keep references to cloned scripts for later restoration
						if (hasScripts) {

							// Support: Android <=4.0 only, PhantomJS 1 only
							// push.apply(_, arraylike) throws on ancient WebKit
							jQuery.merge(scripts, getAll(node, "script"));
						}
					}

					callback.call(collection[i], node, i);
				}

				if (hasScripts) {
					doc = scripts[scripts.length - 1].ownerDocument;

					// Reenable scripts
					jQuery.map(scripts, restoreScript);

					// Evaluate executable scripts on first document insertion
					for (i = 0; i < hasScripts; i++) {
						node = scripts[i];
						if (rscriptType.test(node.type || "") && !dataPriv.access(node, "globalEval") && jQuery.contains(doc, node)) {

							if (node.src) {

								// Optional AJAX dependency, but won't run scripts if not present
								if (jQuery._evalUrl) {
									jQuery._evalUrl(node.src);
								}
							} else {
								DOMEval(node.textContent.replace(rcleanScript, ""), doc);
							}
						}
					}
				}
			}
		}

		return collection;
	}

	function _remove(elem, selector, keepData) {
		var node,
		    nodes = selector ? jQuery.filter(selector, elem) : elem,
		    i = 0;

		for (; (node = nodes[i]) != null; i++) {
			if (!keepData && node.nodeType === 1) {
				jQuery.cleanData(getAll(node));
			}

			if (node.parentNode) {
				if (keepData && jQuery.contains(node.ownerDocument, node)) {
					setGlobalEval(getAll(node, "script"));
				}
				node.parentNode.removeChild(node);
			}
		}

		return elem;
	}

	jQuery.extend({
		htmlPrefilter: function htmlPrefilter(html) {
			return html.replace(rxhtmlTag, "<$1></$2>");
		},

		clone: function clone(elem, dataAndEvents, deepDataAndEvents) {
			var i,
			    l,
			    srcElements,
			    destElements,
			    clone = elem.cloneNode(true),
			    inPage = jQuery.contains(elem.ownerDocument, elem);

			// Fix IE cloning issues
			if (!support.noCloneChecked && (elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem)) {

				// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
				destElements = getAll(clone);
				srcElements = getAll(elem);

				for (i = 0, l = srcElements.length; i < l; i++) {
					fixInput(srcElements[i], destElements[i]);
				}
			}

			// Copy the events from the original to the clone
			if (dataAndEvents) {
				if (deepDataAndEvents) {
					srcElements = srcElements || getAll(elem);
					destElements = destElements || getAll(clone);

					for (i = 0, l = srcElements.length; i < l; i++) {
						cloneCopyEvent(srcElements[i], destElements[i]);
					}
				} else {
					cloneCopyEvent(elem, clone);
				}
			}

			// Preserve script evaluation history
			destElements = getAll(clone, "script");
			if (destElements.length > 0) {
				setGlobalEval(destElements, !inPage && getAll(elem, "script"));
			}

			// Return the cloned set
			return clone;
		},

		cleanData: function cleanData(elems) {
			var data,
			    elem,
			    type,
			    special = jQuery.event.special,
			    i = 0;

			for (; (elem = elems[i]) !== undefined; i++) {
				if (acceptData(elem)) {
					if (data = elem[dataPriv.expando]) {
						if (data.events) {
							for (type in data.events) {
								if (special[type]) {
									jQuery.event.remove(elem, type);

									// This is a shortcut to avoid jQuery.event.remove's overhead
								} else {
									jQuery.removeEvent(elem, type, data.handle);
								}
							}
						}

						// Support: Chrome <=35 - 45+
						// Assign undefined instead of using delete, see Data#remove
						elem[dataPriv.expando] = undefined;
					}
					if (elem[dataUser.expando]) {

						// Support: Chrome <=35 - 45+
						// Assign undefined instead of using delete, see Data#remove
						elem[dataUser.expando] = undefined;
					}
				}
			}
		}
	});

	jQuery.fn.extend({
		detach: function detach(selector) {
			return _remove(this, selector, true);
		},

		remove: function remove(selector) {
			return _remove(this, selector);
		},

		text: function text(value) {
			return access(this, function (value) {
				return value === undefined ? jQuery.text(this) : this.empty().each(function () {
					if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
						this.textContent = value;
					}
				});
			}, null, value, arguments.length);
		},

		append: function append() {
			return domManip(this, arguments, function (elem) {
				if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
					var target = manipulationTarget(this, elem);
					target.appendChild(elem);
				}
			});
		},

		prepend: function prepend() {
			return domManip(this, arguments, function (elem) {
				if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
					var target = manipulationTarget(this, elem);
					target.insertBefore(elem, target.firstChild);
				}
			});
		},

		before: function before() {
			return domManip(this, arguments, function (elem) {
				if (this.parentNode) {
					this.parentNode.insertBefore(elem, this);
				}
			});
		},

		after: function after() {
			return domManip(this, arguments, function (elem) {
				if (this.parentNode) {
					this.parentNode.insertBefore(elem, this.nextSibling);
				}
			});
		},

		empty: function empty() {
			var elem,
			    i = 0;

			for (; (elem = this[i]) != null; i++) {
				if (elem.nodeType === 1) {

					// Prevent memory leaks
					jQuery.cleanData(getAll(elem, false));

					// Remove any remaining nodes
					elem.textContent = "";
				}
			}

			return this;
		},

		clone: function clone(dataAndEvents, deepDataAndEvents) {
			dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
			deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

			return this.map(function () {
				return jQuery.clone(this, dataAndEvents, deepDataAndEvents);
			});
		},

		html: function html(value) {
			return access(this, function (value) {
				var elem = this[0] || {},
				    i = 0,
				    l = this.length;

				if (value === undefined && elem.nodeType === 1) {
					return elem.innerHTML;
				}

				// See if we can take a shortcut and just use innerHTML
				if (typeof value === "string" && !rnoInnerhtml.test(value) && !wrapMap[(rtagName.exec(value) || ["", ""])[1].toLowerCase()]) {

					value = jQuery.htmlPrefilter(value);

					try {
						for (; i < l; i++) {
							elem = this[i] || {};

							// Remove element nodes and prevent memory leaks
							if (elem.nodeType === 1) {
								jQuery.cleanData(getAll(elem, false));
								elem.innerHTML = value;
							}
						}

						elem = 0;

						// If using innerHTML throws an exception, use the fallback method
					} catch (e) {}
				}

				if (elem) {
					this.empty().append(value);
				}
			}, null, value, arguments.length);
		},

		replaceWith: function replaceWith() {
			var ignored = [];

			// Make the changes, replacing each non-ignored context element with the new content
			return domManip(this, arguments, function (elem) {
				var parent = this.parentNode;

				if (jQuery.inArray(this, ignored) < 0) {
					jQuery.cleanData(getAll(this));
					if (parent) {
						parent.replaceChild(elem, this);
					}
				}

				// Force callback invocation
			}, ignored);
		}
	});

	jQuery.each({
		appendTo: "append",
		prependTo: "prepend",
		insertBefore: "before",
		insertAfter: "after",
		replaceAll: "replaceWith"
	}, function (name, original) {
		jQuery.fn[name] = function (selector) {
			var elems,
			    ret = [],
			    insert = jQuery(selector),
			    last = insert.length - 1,
			    i = 0;

			for (; i <= last; i++) {
				elems = i === last ? this : this.clone(true);
				jQuery(insert[i])[original](elems);

				// Support: Android <=4.0 only, PhantomJS 1 only
				// .get() because push.apply(_, arraylike) throws on ancient WebKit
				push.apply(ret, elems.get());
			}

			return this.pushStack(ret);
		};
	});
	var rmargin = /^margin/;

	var rnumnonpx = new RegExp("^(" + pnum + ")(?!px)[a-z%]+$", "i");

	var getStyles = function getStyles(elem) {

		// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
		// IE throws on elements created in popups
		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
		var view = elem.ownerDocument.defaultView;

		if (!view || !view.opener) {
			view = window;
		}

		return view.getComputedStyle(elem);
	};

	(function () {

		// Executing both pixelPosition & boxSizingReliable tests require only one layout
		// so they're executed at the same time to save the second computation.
		function computeStyleTests() {

			// This is a singleton, we need to execute it only once
			if (!div) {
				return;
			}

			div.style.cssText = "box-sizing:border-box;" + "position:relative;display:block;" + "margin:auto;border:1px;padding:1px;" + "top:1%;width:50%";
			div.innerHTML = "";
			documentElement.appendChild(container);

			var divStyle = window.getComputedStyle(div);
			pixelPositionVal = divStyle.top !== "1%";

			// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44
			reliableMarginLeftVal = divStyle.marginLeft === "2px";
			boxSizingReliableVal = divStyle.width === "4px";

			// Support: Android 4.0 - 4.3 only
			// Some styles come back with percentage values, even though they shouldn't
			div.style.marginRight = "50%";
			pixelMarginRightVal = divStyle.marginRight === "4px";

			documentElement.removeChild(container);

			// Nullify the div so it wouldn't be stored in the memory and
			// it will also be a sign that checks already performed
			div = null;
		}

		var pixelPositionVal,
		    boxSizingReliableVal,
		    pixelMarginRightVal,
		    reliableMarginLeftVal,
		    container = document.createElement("div"),
		    div = document.createElement("div");

		// Finish early in limited (non-browser) environments
		if (!div.style) {
			return;
		}

		// Support: IE <=9 - 11 only
		// Style of cloned element affects source element cloned (#8908)
		div.style.backgroundClip = "content-box";
		div.cloneNode(true).style.backgroundClip = "";
		support.clearCloneStyle = div.style.backgroundClip === "content-box";

		container.style.cssText = "border:0;width:8px;height:0;top:0;left:-9999px;" + "padding:0;margin-top:1px;position:absolute";
		container.appendChild(div);

		jQuery.extend(support, {
			pixelPosition: function pixelPosition() {
				computeStyleTests();
				return pixelPositionVal;
			},
			boxSizingReliable: function boxSizingReliable() {
				computeStyleTests();
				return boxSizingReliableVal;
			},
			pixelMarginRight: function pixelMarginRight() {
				computeStyleTests();
				return pixelMarginRightVal;
			},
			reliableMarginLeft: function reliableMarginLeft() {
				computeStyleTests();
				return reliableMarginLeftVal;
			}
		});
	})();

	function curCSS(elem, name, computed) {
		var width,
		    minWidth,
		    maxWidth,
		    ret,


		// Support: Firefox 51+
		// Retrieving style before computed somehow
		// fixes an issue with getting wrong values
		// on detached elements
		style = elem.style;

		computed = computed || getStyles(elem);

		// getPropertyValue is needed for:
		//   .css('filter') (IE 9 only, #12537)
		//   .css('--customProperty) (#3144)
		if (computed) {
			ret = computed.getPropertyValue(name) || computed[name];

			if (ret === "" && !jQuery.contains(elem.ownerDocument, elem)) {
				ret = jQuery.style(elem, name);
			}

			// A tribute to the "awesome hack by Dean Edwards"
			// Android Browser returns percentage for some values,
			// but width seems to be reliably pixels.
			// This is against the CSSOM draft spec:
			// https://drafts.csswg.org/cssom/#resolved-values
			if (!support.pixelMarginRight() && rnumnonpx.test(ret) && rmargin.test(name)) {

				// Remember the original values
				width = style.width;
				minWidth = style.minWidth;
				maxWidth = style.maxWidth;

				// Put in the new values to get a computed value out
				style.minWidth = style.maxWidth = style.width = ret;
				ret = computed.width;

				// Revert the changed values
				style.width = width;
				style.minWidth = minWidth;
				style.maxWidth = maxWidth;
			}
		}

		return ret !== undefined ?

		// Support: IE <=9 - 11 only
		// IE returns zIndex value as an integer.
		ret + "" : ret;
	}

	function addGetHookIf(conditionFn, hookFn) {

		// Define the hook, we'll check on the first run if it's really needed.
		return {
			get: function get() {
				if (conditionFn()) {

					// Hook not needed (or it's not possible to use it due
					// to missing dependency), remove it.
					delete this.get;
					return;
				}

				// Hook needed; redefine it so that the support test is not executed again.
				return (this.get = hookFn).apply(this, arguments);
			}
		};
	}

	var

	// Swappable if display is none or starts with table
	// except "table", "table-cell", or "table-caption"
	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	    rcustomProp = /^--/,
	    cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	    cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	},
	    cssPrefixes = ["Webkit", "Moz", "ms"],
	    emptyStyle = document.createElement("div").style;

	// Return a css property mapped to a potentially vendor prefixed property
	function vendorPropName(name) {

		// Shortcut for names that are not vendor prefixed
		if (name in emptyStyle) {
			return name;
		}

		// Check for vendor prefixed names
		var capName = name[0].toUpperCase() + name.slice(1),
		    i = cssPrefixes.length;

		while (i--) {
			name = cssPrefixes[i] + capName;
			if (name in emptyStyle) {
				return name;
			}
		}
	}

	// Return a property mapped along what jQuery.cssProps suggests or to
	// a vendor prefixed property.
	function finalPropName(name) {
		var ret = jQuery.cssProps[name];
		if (!ret) {
			ret = jQuery.cssProps[name] = vendorPropName(name) || name;
		}
		return ret;
	}

	function setPositiveNumber(elem, value, subtract) {

		// Any relative (+/-) values have already been
		// normalized at this point
		var matches = rcssNum.exec(value);
		return matches ?

		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max(0, matches[2] - (subtract || 0)) + (matches[3] || "px") : value;
	}

	function augmentWidthOrHeight(elem, name, extra, isBorderBox, styles) {
		var i,
		    val = 0;

		// If we already have the right measurement, avoid augmentation
		if (extra === (isBorderBox ? "border" : "content")) {
			i = 4;

			// Otherwise initialize for horizontal or vertical properties
		} else {
			i = name === "width" ? 1 : 0;
		}

		for (; i < 4; i += 2) {

			// Both box models exclude margin, so add it if we want it
			if (extra === "margin") {
				val += jQuery.css(elem, extra + cssExpand[i], true, styles);
			}

			if (isBorderBox) {

				// border-box includes padding, so remove it if we want content
				if (extra === "content") {
					val -= jQuery.css(elem, "padding" + cssExpand[i], true, styles);
				}

				// At this point, extra isn't border nor margin, so remove border
				if (extra !== "margin") {
					val -= jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
				}
			} else {

				// At this point, extra isn't content, so add padding
				val += jQuery.css(elem, "padding" + cssExpand[i], true, styles);

				// At this point, extra isn't content nor padding, so add border
				if (extra !== "padding") {
					val += jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
				}
			}
		}

		return val;
	}

	function getWidthOrHeight(elem, name, extra) {

		// Start with computed style
		var valueIsBorderBox,
		    styles = getStyles(elem),
		    val = curCSS(elem, name, styles),
		    isBorderBox = jQuery.css(elem, "boxSizing", false, styles) === "border-box";

		// Computed unit is not pixels. Stop here and return.
		if (rnumnonpx.test(val)) {
			return val;
		}

		// Check for style in case a browser which returns unreliable values
		// for getComputedStyle silently falls back to the reliable elem.style
		valueIsBorderBox = isBorderBox && (support.boxSizingReliable() || val === elem.style[name]);

		// Fall back to offsetWidth/Height when value is "auto"
		// This happens for inline elements with no explicit setting (gh-3571)
		if (val === "auto") {
			val = elem["offset" + name[0].toUpperCase() + name.slice(1)];
		}

		// Normalize "", auto, and prepare for extra
		val = parseFloat(val) || 0;

		// Use the active box-sizing model to add/subtract irrelevant styles
		return val + augmentWidthOrHeight(elem, name, extra || (isBorderBox ? "border" : "content"), valueIsBorderBox, styles) + "px";
	}

	jQuery.extend({

		// Add in style property hooks for overriding the default
		// behavior of getting and setting a style property
		cssHooks: {
			opacity: {
				get: function get(elem, computed) {
					if (computed) {

						// We should always get a number back from opacity
						var ret = curCSS(elem, "opacity");
						return ret === "" ? "1" : ret;
					}
				}
			}
		},

		// Don't automatically add "px" to these possibly-unitless properties
		cssNumber: {
			"animationIterationCount": true,
			"columnCount": true,
			"fillOpacity": true,
			"flexGrow": true,
			"flexShrink": true,
			"fontWeight": true,
			"lineHeight": true,
			"opacity": true,
			"order": true,
			"orphans": true,
			"widows": true,
			"zIndex": true,
			"zoom": true
		},

		// Add in properties whose names you wish to fix before
		// setting or getting the value
		cssProps: {
			"float": "cssFloat"
		},

		// Get and set the style property on a DOM Node
		style: function style(elem, name, value, extra) {

			// Don't set styles on text and comment nodes
			if (!elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style) {
				return;
			}

			// Make sure that we're working with the right name
			var ret,
			    type,
			    hooks,
			    origName = jQuery.camelCase(name),
			    isCustomProp = rcustomProp.test(name),
			    style = elem.style;

			// Make sure that we're working with the right name. We don't
			// want to query the value if it is a CSS custom property
			// since they are user-defined.
			if (!isCustomProp) {
				name = finalPropName(origName);
			}

			// Gets hook for the prefixed version, then unprefixed version
			hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];

			// Check if we're setting a value
			if (value !== undefined) {
				type = typeof value;

				// Convert "+=" or "-=" to relative numbers (#7345)
				if (type === "string" && (ret = rcssNum.exec(value)) && ret[1]) {
					value = adjustCSS(elem, name, ret);

					// Fixes bug #9237
					type = "number";
				}

				// Make sure that null and NaN values aren't set (#7116)
				if (value == null || value !== value) {
					return;
				}

				// If a number was passed in, add the unit (except for certain CSS properties)
				if (type === "number") {
					value += ret && ret[3] || (jQuery.cssNumber[origName] ? "" : "px");
				}

				// background-* props affect original clone's values
				if (!support.clearCloneStyle && value === "" && name.indexOf("background") === 0) {
					style[name] = "inherit";
				}

				// If a hook was provided, use that value, otherwise just set the specified value
				if (!hooks || !("set" in hooks) || (value = hooks.set(elem, value, extra)) !== undefined) {

					if (isCustomProp) {
						style.setProperty(name, value);
					} else {
						style[name] = value;
					}
				}
			} else {

				// If a hook was provided get the non-computed value from there
				if (hooks && "get" in hooks && (ret = hooks.get(elem, false, extra)) !== undefined) {

					return ret;
				}

				// Otherwise just get the value from the style object
				return style[name];
			}
		},

		css: function css(elem, name, extra, styles) {
			var val,
			    num,
			    hooks,
			    origName = jQuery.camelCase(name),
			    isCustomProp = rcustomProp.test(name);

			// Make sure that we're working with the right name. We don't
			// want to modify the value if it is a CSS custom property
			// since they are user-defined.
			if (!isCustomProp) {
				name = finalPropName(origName);
			}

			// Try prefixed name followed by the unprefixed name
			hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];

			// If a hook was provided get the computed value from there
			if (hooks && "get" in hooks) {
				val = hooks.get(elem, true, extra);
			}

			// Otherwise, if a way to get the computed value exists, use that
			if (val === undefined) {
				val = curCSS(elem, name, styles);
			}

			// Convert "normal" to computed value
			if (val === "normal" && name in cssNormalTransform) {
				val = cssNormalTransform[name];
			}

			// Make numeric if forced or a qualifier was provided and val looks numeric
			if (extra === "" || extra) {
				num = parseFloat(val);
				return extra === true || isFinite(num) ? num || 0 : val;
			}

			return val;
		}
	});

	jQuery.each(["height", "width"], function (i, name) {
		jQuery.cssHooks[name] = {
			get: function get(elem, computed, extra) {
				if (computed) {

					// Certain elements can have dimension info if we invisibly show them
					// but it must have a current display style that would benefit
					return rdisplayswap.test(jQuery.css(elem, "display")) && (

					// Support: Safari 8+
					// Table columns in Safari have non-zero offsetWidth & zero
					// getBoundingClientRect().width unless display is changed.
					// Support: IE <=11 only
					// Running getBoundingClientRect on a disconnected node
					// in IE throws an error.
					!elem.getClientRects().length || !elem.getBoundingClientRect().width) ? swap(elem, cssShow, function () {
						return getWidthOrHeight(elem, name, extra);
					}) : getWidthOrHeight(elem, name, extra);
				}
			},

			set: function set(elem, value, extra) {
				var matches,
				    styles = extra && getStyles(elem),
				    subtract = extra && augmentWidthOrHeight(elem, name, extra, jQuery.css(elem, "boxSizing", false, styles) === "border-box", styles);

				// Convert to pixels if value adjustment is needed
				if (subtract && (matches = rcssNum.exec(value)) && (matches[3] || "px") !== "px") {

					elem.style[name] = value;
					value = jQuery.css(elem, name);
				}

				return setPositiveNumber(elem, value, subtract);
			}
		};
	});

	jQuery.cssHooks.marginLeft = addGetHookIf(support.reliableMarginLeft, function (elem, computed) {
		if (computed) {
			return (parseFloat(curCSS(elem, "marginLeft")) || elem.getBoundingClientRect().left - swap(elem, { marginLeft: 0 }, function () {
				return elem.getBoundingClientRect().left;
			})) + "px";
		}
	});

	// These hooks are used by animate to expand properties
	jQuery.each({
		margin: "",
		padding: "",
		border: "Width"
	}, function (prefix, suffix) {
		jQuery.cssHooks[prefix + suffix] = {
			expand: function expand(value) {
				var i = 0,
				    expanded = {},


				// Assumes a single number if not a string
				parts = typeof value === "string" ? value.split(" ") : [value];

				for (; i < 4; i++) {
					expanded[prefix + cssExpand[i] + suffix] = parts[i] || parts[i - 2] || parts[0];
				}

				return expanded;
			}
		};

		if (!rmargin.test(prefix)) {
			jQuery.cssHooks[prefix + suffix].set = setPositiveNumber;
		}
	});

	jQuery.fn.extend({
		css: function css(name, value) {
			return access(this, function (elem, name, value) {
				var styles,
				    len,
				    map = {},
				    i = 0;

				if (Array.isArray(name)) {
					styles = getStyles(elem);
					len = name.length;

					for (; i < len; i++) {
						map[name[i]] = jQuery.css(elem, name[i], false, styles);
					}

					return map;
				}

				return value !== undefined ? jQuery.style(elem, name, value) : jQuery.css(elem, name);
			}, name, value, arguments.length > 1);
		}
	});

	function Tween(elem, options, prop, end, easing) {
		return new Tween.prototype.init(elem, options, prop, end, easing);
	}
	jQuery.Tween = Tween;

	Tween.prototype = {
		constructor: Tween,
		init: function init(elem, options, prop, end, easing, unit) {
			this.elem = elem;
			this.prop = prop;
			this.easing = easing || jQuery.easing._default;
			this.options = options;
			this.start = this.now = this.cur();
			this.end = end;
			this.unit = unit || (jQuery.cssNumber[prop] ? "" : "px");
		},
		cur: function cur() {
			var hooks = Tween.propHooks[this.prop];

			return hooks && hooks.get ? hooks.get(this) : Tween.propHooks._default.get(this);
		},
		run: function run(percent) {
			var eased,
			    hooks = Tween.propHooks[this.prop];

			if (this.options.duration) {
				this.pos = eased = jQuery.easing[this.easing](percent, this.options.duration * percent, 0, 1, this.options.duration);
			} else {
				this.pos = eased = percent;
			}
			this.now = (this.end - this.start) * eased + this.start;

			if (this.options.step) {
				this.options.step.call(this.elem, this.now, this);
			}

			if (hooks && hooks.set) {
				hooks.set(this);
			} else {
				Tween.propHooks._default.set(this);
			}
			return this;
		}
	};

	Tween.prototype.init.prototype = Tween.prototype;

	Tween.propHooks = {
		_default: {
			get: function get(tween) {
				var result;

				// Use a property on the element directly when it is not a DOM element,
				// or when there is no matching style property that exists.
				if (tween.elem.nodeType !== 1 || tween.elem[tween.prop] != null && tween.elem.style[tween.prop] == null) {
					return tween.elem[tween.prop];
				}

				// Passing an empty string as a 3rd parameter to .css will automatically
				// attempt a parseFloat and fallback to a string if the parse fails.
				// Simple values such as "10px" are parsed to Float;
				// complex values such as "rotate(1rad)" are returned as-is.
				result = jQuery.css(tween.elem, tween.prop, "");

				// Empty strings, null, undefined and "auto" are converted to 0.
				return !result || result === "auto" ? 0 : result;
			},
			set: function set(tween) {

				// Use step hook for back compat.
				// Use cssHook if its there.
				// Use .style if available and use plain properties where available.
				if (jQuery.fx.step[tween.prop]) {
					jQuery.fx.step[tween.prop](tween);
				} else if (tween.elem.nodeType === 1 && (tween.elem.style[jQuery.cssProps[tween.prop]] != null || jQuery.cssHooks[tween.prop])) {
					jQuery.style(tween.elem, tween.prop, tween.now + tween.unit);
				} else {
					tween.elem[tween.prop] = tween.now;
				}
			}
		}
	};

	// Support: IE <=9 only
	// Panic based approach to setting things on disconnected nodes
	Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
		set: function set(tween) {
			if (tween.elem.nodeType && tween.elem.parentNode) {
				tween.elem[tween.prop] = tween.now;
			}
		}
	};

	jQuery.easing = {
		linear: function linear(p) {
			return p;
		},
		swing: function swing(p) {
			return 0.5 - Math.cos(p * Math.PI) / 2;
		},
		_default: "swing"
	};

	jQuery.fx = Tween.prototype.init;

	// Back compat <1.8 extension point
	jQuery.fx.step = {};

	var fxNow,
	    inProgress,
	    rfxtypes = /^(?:toggle|show|hide)$/,
	    rrun = /queueHooks$/;

	function schedule() {
		if (inProgress) {
			if (document.hidden === false && window.requestAnimationFrame) {
				window.requestAnimationFrame(schedule);
			} else {
				window.setTimeout(schedule, jQuery.fx.interval);
			}

			jQuery.fx.tick();
		}
	}

	// Animations created synchronously will run synchronously
	function createFxNow() {
		window.setTimeout(function () {
			fxNow = undefined;
		});
		return fxNow = jQuery.now();
	}

	// Generate parameters to create a standard animation
	function genFx(type, includeWidth) {
		var which,
		    i = 0,
		    attrs = { height: type };

		// If we include width, step value is 1 to do all cssExpand values,
		// otherwise step value is 2 to skip over Left and Right
		includeWidth = includeWidth ? 1 : 0;
		for (; i < 4; i += 2 - includeWidth) {
			which = cssExpand[i];
			attrs["margin" + which] = attrs["padding" + which] = type;
		}

		if (includeWidth) {
			attrs.opacity = attrs.width = type;
		}

		return attrs;
	}

	function createTween(value, prop, animation) {
		var tween,
		    collection = (Animation.tweeners[prop] || []).concat(Animation.tweeners["*"]),
		    index = 0,
		    length = collection.length;
		for (; index < length; index++) {
			if (tween = collection[index].call(animation, prop, value)) {

				// We're done with this property
				return tween;
			}
		}
	}

	function defaultPrefilter(elem, props, opts) {
		var prop,
		    value,
		    toggle,
		    hooks,
		    oldfire,
		    propTween,
		    restoreDisplay,
		    display,
		    isBox = "width" in props || "height" in props,
		    anim = this,
		    orig = {},
		    style = elem.style,
		    hidden = elem.nodeType && isHiddenWithinTree(elem),
		    dataShow = dataPriv.get(elem, "fxshow");

		// Queue-skipping animations hijack the fx hooks
		if (!opts.queue) {
			hooks = jQuery._queueHooks(elem, "fx");
			if (hooks.unqueued == null) {
				hooks.unqueued = 0;
				oldfire = hooks.empty.fire;
				hooks.empty.fire = function () {
					if (!hooks.unqueued) {
						oldfire();
					}
				};
			}
			hooks.unqueued++;

			anim.always(function () {

				// Ensure the complete handler is called before this completes
				anim.always(function () {
					hooks.unqueued--;
					if (!jQuery.queue(elem, "fx").length) {
						hooks.empty.fire();
					}
				});
			});
		}

		// Detect show/hide animations
		for (prop in props) {
			value = props[prop];
			if (rfxtypes.test(value)) {
				delete props[prop];
				toggle = toggle || value === "toggle";
				if (value === (hidden ? "hide" : "show")) {

					// Pretend to be hidden if this is a "show" and
					// there is still data from a stopped show/hide
					if (value === "show" && dataShow && dataShow[prop] !== undefined) {
						hidden = true;

						// Ignore all other no-op show/hide data
					} else {
						continue;
					}
				}
				orig[prop] = dataShow && dataShow[prop] || jQuery.style(elem, prop);
			}
		}

		// Bail out if this is a no-op like .hide().hide()
		propTween = !jQuery.isEmptyObject(props);
		if (!propTween && jQuery.isEmptyObject(orig)) {
			return;
		}

		// Restrict "overflow" and "display" styles during box animations
		if (isBox && elem.nodeType === 1) {

			// Support: IE <=9 - 11, Edge 12 - 13
			// Record all 3 overflow attributes because IE does not infer the shorthand
			// from identically-valued overflowX and overflowY
			opts.overflow = [style.overflow, style.overflowX, style.overflowY];

			// Identify a display type, preferring old show/hide data over the CSS cascade
			restoreDisplay = dataShow && dataShow.display;
			if (restoreDisplay == null) {
				restoreDisplay = dataPriv.get(elem, "display");
			}
			display = jQuery.css(elem, "display");
			if (display === "none") {
				if (restoreDisplay) {
					display = restoreDisplay;
				} else {

					// Get nonempty value(s) by temporarily forcing visibility
					showHide([elem], true);
					restoreDisplay = elem.style.display || restoreDisplay;
					display = jQuery.css(elem, "display");
					showHide([elem]);
				}
			}

			// Animate inline elements as inline-block
			if (display === "inline" || display === "inline-block" && restoreDisplay != null) {
				if (jQuery.css(elem, "float") === "none") {

					// Restore the original display value at the end of pure show/hide animations
					if (!propTween) {
						anim.done(function () {
							style.display = restoreDisplay;
						});
						if (restoreDisplay == null) {
							display = style.display;
							restoreDisplay = display === "none" ? "" : display;
						}
					}
					style.display = "inline-block";
				}
			}
		}

		if (opts.overflow) {
			style.overflow = "hidden";
			anim.always(function () {
				style.overflow = opts.overflow[0];
				style.overflowX = opts.overflow[1];
				style.overflowY = opts.overflow[2];
			});
		}

		// Implement show/hide animations
		propTween = false;
		for (prop in orig) {

			// General show/hide setup for this element animation
			if (!propTween) {
				if (dataShow) {
					if ("hidden" in dataShow) {
						hidden = dataShow.hidden;
					}
				} else {
					dataShow = dataPriv.access(elem, "fxshow", { display: restoreDisplay });
				}

				// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
				if (toggle) {
					dataShow.hidden = !hidden;
				}

				// Show elements before animating them
				if (hidden) {
					showHide([elem], true);
				}

				/* eslint-disable no-loop-func */

				anim.done(function () {

					/* eslint-enable no-loop-func */

					// The final step of a "hide" animation is actually hiding the element
					if (!hidden) {
						showHide([elem]);
					}
					dataPriv.remove(elem, "fxshow");
					for (prop in orig) {
						jQuery.style(elem, prop, orig[prop]);
					}
				});
			}

			// Per-property setup
			propTween = createTween(hidden ? dataShow[prop] : 0, prop, anim);
			if (!(prop in dataShow)) {
				dataShow[prop] = propTween.start;
				if (hidden) {
					propTween.end = propTween.start;
					propTween.start = 0;
				}
			}
		}
	}

	function propFilter(props, specialEasing) {
		var index, name, easing, value, hooks;

		// camelCase, specialEasing and expand cssHook pass
		for (index in props) {
			name = jQuery.camelCase(index);
			easing = specialEasing[name];
			value = props[index];
			if (Array.isArray(value)) {
				easing = value[1];
				value = props[index] = value[0];
			}

			if (index !== name) {
				props[name] = value;
				delete props[index];
			}

			hooks = jQuery.cssHooks[name];
			if (hooks && "expand" in hooks) {
				value = hooks.expand(value);
				delete props[name];

				// Not quite $.extend, this won't overwrite existing keys.
				// Reusing 'index' because we have the correct "name"
				for (index in value) {
					if (!(index in props)) {
						props[index] = value[index];
						specialEasing[index] = easing;
					}
				}
			} else {
				specialEasing[name] = easing;
			}
		}
	}

	function Animation(elem, properties, options) {
		var result,
		    stopped,
		    index = 0,
		    length = Animation.prefilters.length,
		    deferred = jQuery.Deferred().always(function () {

			// Don't match elem in the :animated selector
			delete tick.elem;
		}),
		    tick = function tick() {
			if (stopped) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
			    remaining = Math.max(0, animation.startTime + animation.duration - currentTime),


			// Support: Android 2.3 only
			// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
			temp = remaining / animation.duration || 0,
			    percent = 1 - temp,
			    index = 0,
			    length = animation.tweens.length;

			for (; index < length; index++) {
				animation.tweens[index].run(percent);
			}

			deferred.notifyWith(elem, [animation, percent, remaining]);

			// If there's more to do, yield
			if (percent < 1 && length) {
				return remaining;
			}

			// If this was an empty animation, synthesize a final progress notification
			if (!length) {
				deferred.notifyWith(elem, [animation, 1, 0]);
			}

			// Resolve the animation and report its conclusion
			deferred.resolveWith(elem, [animation]);
			return false;
		},
		    animation = deferred.promise({
			elem: elem,
			props: jQuery.extend({}, properties),
			opts: jQuery.extend(true, {
				specialEasing: {},
				easing: jQuery.easing._default
			}, options),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function createTween(prop, end) {
				var tween = jQuery.Tween(elem, animation.opts, prop, end, animation.opts.specialEasing[prop] || animation.opts.easing);
				animation.tweens.push(tween);
				return tween;
			},
			stop: function stop(gotoEnd) {
				var index = 0,


				// If we are going to the end, we want to run all the tweens
				// otherwise we skip this part
				length = gotoEnd ? animation.tweens.length : 0;
				if (stopped) {
					return this;
				}
				stopped = true;
				for (; index < length; index++) {
					animation.tweens[index].run(1);
				}

				// Resolve when we played the last frame; otherwise, reject
				if (gotoEnd) {
					deferred.notifyWith(elem, [animation, 1, 0]);
					deferred.resolveWith(elem, [animation, gotoEnd]);
				} else {
					deferred.rejectWith(elem, [animation, gotoEnd]);
				}
				return this;
			}
		}),
		    props = animation.props;

		propFilter(props, animation.opts.specialEasing);

		for (; index < length; index++) {
			result = Animation.prefilters[index].call(animation, elem, props, animation.opts);
			if (result) {
				if (jQuery.isFunction(result.stop)) {
					jQuery._queueHooks(animation.elem, animation.opts.queue).stop = jQuery.proxy(result.stop, result);
				}
				return result;
			}
		}

		jQuery.map(props, createTween, animation);

		if (jQuery.isFunction(animation.opts.start)) {
			animation.opts.start.call(elem, animation);
		}

		// Attach callbacks from options
		animation.progress(animation.opts.progress).done(animation.opts.done, animation.opts.complete).fail(animation.opts.fail).always(animation.opts.always);

		jQuery.fx.timer(jQuery.extend(tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		}));

		return animation;
	}

	jQuery.Animation = jQuery.extend(Animation, {

		tweeners: {
			"*": [function (prop, value) {
				var tween = this.createTween(prop, value);
				adjustCSS(tween.elem, prop, rcssNum.exec(value), tween);
				return tween;
			}]
		},

		tweener: function tweener(props, callback) {
			if (jQuery.isFunction(props)) {
				callback = props;
				props = ["*"];
			} else {
				props = props.match(rnothtmlwhite);
			}

			var prop,
			    index = 0,
			    length = props.length;

			for (; index < length; index++) {
				prop = props[index];
				Animation.tweeners[prop] = Animation.tweeners[prop] || [];
				Animation.tweeners[prop].unshift(callback);
			}
		},

		prefilters: [defaultPrefilter],

		prefilter: function prefilter(callback, prepend) {
			if (prepend) {
				Animation.prefilters.unshift(callback);
			} else {
				Animation.prefilters.push(callback);
			}
		}
	});

	jQuery.speed = function (speed, easing, fn) {
		var opt = speed && typeof speed === "object" ? jQuery.extend({}, speed) : {
			complete: fn || !fn && easing || jQuery.isFunction(speed) && speed,
			duration: speed,
			easing: fn && easing || easing && !jQuery.isFunction(easing) && easing
		};

		// Go to the end state if fx are off
		if (jQuery.fx.off) {
			opt.duration = 0;
		} else {
			if (typeof opt.duration !== "number") {
				if (opt.duration in jQuery.fx.speeds) {
					opt.duration = jQuery.fx.speeds[opt.duration];
				} else {
					opt.duration = jQuery.fx.speeds._default;
				}
			}
		}

		// Normalize opt.queue - true/undefined/null -> "fx"
		if (opt.queue == null || opt.queue === true) {
			opt.queue = "fx";
		}

		// Queueing
		opt.old = opt.complete;

		opt.complete = function () {
			if (jQuery.isFunction(opt.old)) {
				opt.old.call(this);
			}

			if (opt.queue) {
				jQuery.dequeue(this, opt.queue);
			}
		};

		return opt;
	};

	jQuery.fn.extend({
		fadeTo: function fadeTo(speed, to, easing, callback) {

			// Show any hidden elements after setting opacity to 0
			return this.filter(isHiddenWithinTree).css("opacity", 0).show()

			// Animate to the value specified
			.end().animate({ opacity: to }, speed, easing, callback);
		},
		animate: function animate(prop, speed, easing, callback) {
			var empty = jQuery.isEmptyObject(prop),
			    optall = jQuery.speed(speed, easing, callback),
			    doAnimation = function doAnimation() {

				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation(this, jQuery.extend({}, prop), optall);

				// Empty animations, or finishing resolves immediately
				if (empty || dataPriv.get(this, "finish")) {
					anim.stop(true);
				}
			};
			doAnimation.finish = doAnimation;

			return empty || optall.queue === false ? this.each(doAnimation) : this.queue(optall.queue, doAnimation);
		},
		stop: function stop(type, clearQueue, gotoEnd) {
			var stopQueue = function stopQueue(hooks) {
				var stop = hooks.stop;
				delete hooks.stop;
				stop(gotoEnd);
			};

			if (typeof type !== "string") {
				gotoEnd = clearQueue;
				clearQueue = type;
				type = undefined;
			}
			if (clearQueue && type !== false) {
				this.queue(type || "fx", []);
			}

			return this.each(function () {
				var dequeue = true,
				    index = type != null && type + "queueHooks",
				    timers = jQuery.timers,
				    data = dataPriv.get(this);

				if (index) {
					if (data[index] && data[index].stop) {
						stopQueue(data[index]);
					}
				} else {
					for (index in data) {
						if (data[index] && data[index].stop && rrun.test(index)) {
							stopQueue(data[index]);
						}
					}
				}

				for (index = timers.length; index--;) {
					if (timers[index].elem === this && (type == null || timers[index].queue === type)) {

						timers[index].anim.stop(gotoEnd);
						dequeue = false;
						timers.splice(index, 1);
					}
				}

				// Start the next in the queue if the last step wasn't forced.
				// Timers currently will call their complete callbacks, which
				// will dequeue but only if they were gotoEnd.
				if (dequeue || !gotoEnd) {
					jQuery.dequeue(this, type);
				}
			});
		},
		finish: function finish(type) {
			if (type !== false) {
				type = type || "fx";
			}
			return this.each(function () {
				var index,
				    data = dataPriv.get(this),
				    queue = data[type + "queue"],
				    hooks = data[type + "queueHooks"],
				    timers = jQuery.timers,
				    length = queue ? queue.length : 0;

				// Enable finishing flag on private data
				data.finish = true;

				// Empty the queue first
				jQuery.queue(this, type, []);

				if (hooks && hooks.stop) {
					hooks.stop.call(this, true);
				}

				// Look for any active animations, and finish them
				for (index = timers.length; index--;) {
					if (timers[index].elem === this && timers[index].queue === type) {
						timers[index].anim.stop(true);
						timers.splice(index, 1);
					}
				}

				// Look for any animations in the old queue and finish them
				for (index = 0; index < length; index++) {
					if (queue[index] && queue[index].finish) {
						queue[index].finish.call(this);
					}
				}

				// Turn off finishing flag
				delete data.finish;
			});
		}
	});

	jQuery.each(["toggle", "show", "hide"], function (i, name) {
		var cssFn = jQuery.fn[name];
		jQuery.fn[name] = function (speed, easing, callback) {
			return speed == null || typeof speed === "boolean" ? cssFn.apply(this, arguments) : this.animate(genFx(name, true), speed, easing, callback);
		};
	});

	// Generate shortcuts for custom animations
	jQuery.each({
		slideDown: genFx("show"),
		slideUp: genFx("hide"),
		slideToggle: genFx("toggle"),
		fadeIn: { opacity: "show" },
		fadeOut: { opacity: "hide" },
		fadeToggle: { opacity: "toggle" }
	}, function (name, props) {
		jQuery.fn[name] = function (speed, easing, callback) {
			return this.animate(props, speed, easing, callback);
		};
	});

	jQuery.timers = [];
	jQuery.fx.tick = function () {
		var timer,
		    i = 0,
		    timers = jQuery.timers;

		fxNow = jQuery.now();

		for (; i < timers.length; i++) {
			timer = timers[i];

			// Run the timer and safely remove it when done (allowing for external removal)
			if (!timer() && timers[i] === timer) {
				timers.splice(i--, 1);
			}
		}

		if (!timers.length) {
			jQuery.fx.stop();
		}
		fxNow = undefined;
	};

	jQuery.fx.timer = function (timer) {
		jQuery.timers.push(timer);
		jQuery.fx.start();
	};

	jQuery.fx.interval = 13;
	jQuery.fx.start = function () {
		if (inProgress) {
			return;
		}

		inProgress = true;
		schedule();
	};

	jQuery.fx.stop = function () {
		inProgress = null;
	};

	jQuery.fx.speeds = {
		slow: 600,
		fast: 200,

		// Default speed
		_default: 400
	};

	// Based off of the plugin by Clint Helfers, with permission.
	// https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
	jQuery.fn.delay = function (time, type) {
		time = jQuery.fx ? jQuery.fx.speeds[time] || time : time;
		type = type || "fx";

		return this.queue(type, function (next, hooks) {
			var timeout = window.setTimeout(next, time);
			hooks.stop = function () {
				window.clearTimeout(timeout);
			};
		});
	};

	(function () {
		var input = document.createElement("input"),
		    select = document.createElement("select"),
		    opt = select.appendChild(document.createElement("option"));

		input.type = "checkbox";

		// Support: Android <=4.3 only
		// Default value for a checkbox should be "on"
		support.checkOn = input.value !== "";

		// Support: IE <=11 only
		// Must access selectedIndex to make default options select
		support.optSelected = opt.selected;

		// Support: IE <=11 only
		// An input loses its value after becoming a radio
		input = document.createElement("input");
		input.value = "t";
		input.type = "radio";
		support.radioValue = input.value === "t";
	})();

	var boolHook,
	    attrHandle = jQuery.expr.attrHandle;

	jQuery.fn.extend({
		attr: function attr(name, value) {
			return access(this, jQuery.attr, name, value, arguments.length > 1);
		},

		removeAttr: function removeAttr(name) {
			return this.each(function () {
				jQuery.removeAttr(this, name);
			});
		}
	});

	jQuery.extend({
		attr: function attr(elem, name, value) {
			var ret,
			    hooks,
			    nType = elem.nodeType;

			// Don't get/set attributes on text, comment and attribute nodes
			if (nType === 3 || nType === 8 || nType === 2) {
				return;
			}

			// Fallback to prop when attributes are not supported
			if (typeof elem.getAttribute === "undefined") {
				return jQuery.prop(elem, name, value);
			}

			// Attribute hooks are determined by the lowercase version
			// Grab necessary hook if one is defined
			if (nType !== 1 || !jQuery.isXMLDoc(elem)) {
				hooks = jQuery.attrHooks[name.toLowerCase()] || (jQuery.expr.match.bool.test(name) ? boolHook : undefined);
			}

			if (value !== undefined) {
				if (value === null) {
					jQuery.removeAttr(elem, name);
					return;
				}

				if (hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined) {
					return ret;
				}

				elem.setAttribute(name, value + "");
				return value;
			}

			if (hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null) {
				return ret;
			}

			ret = jQuery.find.attr(elem, name);

			// Non-existent attributes return null, we normalize to undefined
			return ret == null ? undefined : ret;
		},

		attrHooks: {
			type: {
				set: function set(elem, value) {
					if (!support.radioValue && value === "radio" && nodeName(elem, "input")) {
						var val = elem.value;
						elem.setAttribute("type", value);
						if (val) {
							elem.value = val;
						}
						return value;
					}
				}
			}
		},

		removeAttr: function removeAttr(elem, value) {
			var name,
			    i = 0,


			// Attribute names can contain non-HTML whitespace characters
			// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
			attrNames = value && value.match(rnothtmlwhite);

			if (attrNames && elem.nodeType === 1) {
				while (name = attrNames[i++]) {
					elem.removeAttribute(name);
				}
			}
		}
	});

	// Hooks for boolean attributes
	boolHook = {
		set: function set(elem, value, name) {
			if (value === false) {

				// Remove boolean attributes when set to false
				jQuery.removeAttr(elem, name);
			} else {
				elem.setAttribute(name, name);
			}
			return name;
		}
	};

	jQuery.each(jQuery.expr.match.bool.source.match(/\w+/g), function (i, name) {
		var getter = attrHandle[name] || jQuery.find.attr;

		attrHandle[name] = function (elem, name, isXML) {
			var ret,
			    handle,
			    lowercaseName = name.toLowerCase();

			if (!isXML) {

				// Avoid an infinite loop by temporarily removing this function from the getter
				handle = attrHandle[lowercaseName];
				attrHandle[lowercaseName] = ret;
				ret = getter(elem, name, isXML) != null ? lowercaseName : null;
				attrHandle[lowercaseName] = handle;
			}
			return ret;
		};
	});

	var rfocusable = /^(?:input|select|textarea|button)$/i,
	    rclickable = /^(?:a|area)$/i;

	jQuery.fn.extend({
		prop: function prop(name, value) {
			return access(this, jQuery.prop, name, value, arguments.length > 1);
		},

		removeProp: function removeProp(name) {
			return this.each(function () {
				delete this[jQuery.propFix[name] || name];
			});
		}
	});

	jQuery.extend({
		prop: function prop(elem, name, value) {
			var ret,
			    hooks,
			    nType = elem.nodeType;

			// Don't get/set properties on text, comment and attribute nodes
			if (nType === 3 || nType === 8 || nType === 2) {
				return;
			}

			if (nType !== 1 || !jQuery.isXMLDoc(elem)) {

				// Fix name and attach hooks
				name = jQuery.propFix[name] || name;
				hooks = jQuery.propHooks[name];
			}

			if (value !== undefined) {
				if (hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined) {
					return ret;
				}

				return elem[name] = value;
			}

			if (hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null) {
				return ret;
			}

			return elem[name];
		},

		propHooks: {
			tabIndex: {
				get: function get(elem) {

					// Support: IE <=9 - 11 only
					// elem.tabIndex doesn't always return the
					// correct value when it hasn't been explicitly set
					// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
					// Use proper attribute retrieval(#12072)
					var tabindex = jQuery.find.attr(elem, "tabindex");

					if (tabindex) {
						return parseInt(tabindex, 10);
					}

					if (rfocusable.test(elem.nodeName) || rclickable.test(elem.nodeName) && elem.href) {
						return 0;
					}

					return -1;
				}
			}
		},

		propFix: {
			"for": "htmlFor",
			"class": "className"
		}
	});

	// Support: IE <=11 only
	// Accessing the selectedIndex property
	// forces the browser to respect setting selected
	// on the option
	// The getter ensures a default option is selected
	// when in an optgroup
	// eslint rule "no-unused-expressions" is disabled for this code
	// since it considers such accessions noop
	if (!support.optSelected) {
		jQuery.propHooks.selected = {
			get: function get(elem) {

				/* eslint no-unused-expressions: "off" */

				var parent = elem.parentNode;
				if (parent && parent.parentNode) {
					parent.parentNode.selectedIndex;
				}
				return null;
			},
			set: function set(elem) {

				/* eslint no-unused-expressions: "off" */

				var parent = elem.parentNode;
				if (parent) {
					parent.selectedIndex;

					if (parent.parentNode) {
						parent.parentNode.selectedIndex;
					}
				}
			}
		};
	}

	jQuery.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function () {
		jQuery.propFix[this.toLowerCase()] = this;
	});

	// Strip and collapse whitespace according to HTML spec
	// https://html.spec.whatwg.org/multipage/infrastructure.html#strip-and-collapse-whitespace
	function stripAndCollapse(value) {
		var tokens = value.match(rnothtmlwhite) || [];
		return tokens.join(" ");
	}

	function getClass(elem) {
		return elem.getAttribute && elem.getAttribute("class") || "";
	}

	jQuery.fn.extend({
		addClass: function addClass(value) {
			var classes,
			    elem,
			    cur,
			    curValue,
			    clazz,
			    j,
			    finalValue,
			    i = 0;

			if (jQuery.isFunction(value)) {
				return this.each(function (j) {
					jQuery(this).addClass(value.call(this, j, getClass(this)));
				});
			}

			if (typeof value === "string" && value) {
				classes = value.match(rnothtmlwhite) || [];

				while (elem = this[i++]) {
					curValue = getClass(elem);
					cur = elem.nodeType === 1 && " " + stripAndCollapse(curValue) + " ";

					if (cur) {
						j = 0;
						while (clazz = classes[j++]) {
							if (cur.indexOf(" " + clazz + " ") < 0) {
								cur += clazz + " ";
							}
						}

						// Only assign if different to avoid unneeded rendering.
						finalValue = stripAndCollapse(cur);
						if (curValue !== finalValue) {
							elem.setAttribute("class", finalValue);
						}
					}
				}
			}

			return this;
		},

		removeClass: function removeClass(value) {
			var classes,
			    elem,
			    cur,
			    curValue,
			    clazz,
			    j,
			    finalValue,
			    i = 0;

			if (jQuery.isFunction(value)) {
				return this.each(function (j) {
					jQuery(this).removeClass(value.call(this, j, getClass(this)));
				});
			}

			if (!arguments.length) {
				return this.attr("class", "");
			}

			if (typeof value === "string" && value) {
				classes = value.match(rnothtmlwhite) || [];

				while (elem = this[i++]) {
					curValue = getClass(elem);

					// This expression is here for better compressibility (see addClass)
					cur = elem.nodeType === 1 && " " + stripAndCollapse(curValue) + " ";

					if (cur) {
						j = 0;
						while (clazz = classes[j++]) {

							// Remove *all* instances
							while (cur.indexOf(" " + clazz + " ") > -1) {
								cur = cur.replace(" " + clazz + " ", " ");
							}
						}

						// Only assign if different to avoid unneeded rendering.
						finalValue = stripAndCollapse(cur);
						if (curValue !== finalValue) {
							elem.setAttribute("class", finalValue);
						}
					}
				}
			}

			return this;
		},

		toggleClass: function toggleClass(value, stateVal) {
			var type = typeof value;

			if (typeof stateVal === "boolean" && type === "string") {
				return stateVal ? this.addClass(value) : this.removeClass(value);
			}

			if (jQuery.isFunction(value)) {
				return this.each(function (i) {
					jQuery(this).toggleClass(value.call(this, i, getClass(this), stateVal), stateVal);
				});
			}

			return this.each(function () {
				var className, i, self, classNames;

				if (type === "string") {

					// Toggle individual class names
					i = 0;
					self = jQuery(this);
					classNames = value.match(rnothtmlwhite) || [];

					while (className = classNames[i++]) {

						// Check each className given, space separated list
						if (self.hasClass(className)) {
							self.removeClass(className);
						} else {
							self.addClass(className);
						}
					}

					// Toggle whole class name
				} else if (value === undefined || type === "boolean") {
					className = getClass(this);
					if (className) {

						// Store className if set
						dataPriv.set(this, "__className__", className);
					}

					// If the element has a class name or if we're passed `false`,
					// then remove the whole classname (if there was one, the above saved it).
					// Otherwise bring back whatever was previously saved (if anything),
					// falling back to the empty string if nothing was stored.
					if (this.setAttribute) {
						this.setAttribute("class", className || value === false ? "" : dataPriv.get(this, "__className__") || "");
					}
				}
			});
		},

		hasClass: function hasClass(selector) {
			var className,
			    elem,
			    i = 0;

			className = " " + selector + " ";
			while (elem = this[i++]) {
				if (elem.nodeType === 1 && (" " + stripAndCollapse(getClass(elem)) + " ").indexOf(className) > -1) {
					return true;
				}
			}

			return false;
		}
	});

	var rreturn = /\r/g;

	jQuery.fn.extend({
		val: function val(value) {
			var hooks,
			    ret,
			    isFunction,
			    elem = this[0];

			if (!arguments.length) {
				if (elem) {
					hooks = jQuery.valHooks[elem.type] || jQuery.valHooks[elem.nodeName.toLowerCase()];

					if (hooks && "get" in hooks && (ret = hooks.get(elem, "value")) !== undefined) {
						return ret;
					}

					ret = elem.value;

					// Handle most common string cases
					if (typeof ret === "string") {
						return ret.replace(rreturn, "");
					}

					// Handle cases where value is null/undef or number
					return ret == null ? "" : ret;
				}

				return;
			}

			isFunction = jQuery.isFunction(value);

			return this.each(function (i) {
				var val;

				if (this.nodeType !== 1) {
					return;
				}

				if (isFunction) {
					val = value.call(this, i, jQuery(this).val());
				} else {
					val = value;
				}

				// Treat null/undefined as ""; convert numbers to string
				if (val == null) {
					val = "";
				} else if (typeof val === "number") {
					val += "";
				} else if (Array.isArray(val)) {
					val = jQuery.map(val, function (value) {
						return value == null ? "" : value + "";
					});
				}

				hooks = jQuery.valHooks[this.type] || jQuery.valHooks[this.nodeName.toLowerCase()];

				// If set returns undefined, fall back to normal setting
				if (!hooks || !("set" in hooks) || hooks.set(this, val, "value") === undefined) {
					this.value = val;
				}
			});
		}
	});

	jQuery.extend({
		valHooks: {
			option: {
				get: function get(elem) {

					var val = jQuery.find.attr(elem, "value");
					return val != null ? val :

					// Support: IE <=10 - 11 only
					// option.text throws exceptions (#14686, #14858)
					// Strip and collapse whitespace
					// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
					stripAndCollapse(jQuery.text(elem));
				}
			},
			select: {
				get: function get(elem) {
					var value,
					    option,
					    i,
					    options = elem.options,
					    index = elem.selectedIndex,
					    one = elem.type === "select-one",
					    values = one ? null : [],
					    max = one ? index + 1 : options.length;

					if (index < 0) {
						i = max;
					} else {
						i = one ? index : 0;
					}

					// Loop through all the selected options
					for (; i < max; i++) {
						option = options[i];

						// Support: IE <=9 only
						// IE8-9 doesn't update selected after form reset (#2551)
						if ((option.selected || i === index) &&

						// Don't return options that are disabled or in a disabled optgroup
						!option.disabled && (!option.parentNode.disabled || !nodeName(option.parentNode, "optgroup"))) {

							// Get the specific value for the option
							value = jQuery(option).val();

							// We don't need an array for one selects
							if (one) {
								return value;
							}

							// Multi-Selects return an array
							values.push(value);
						}
					}

					return values;
				},

				set: function set(elem, value) {
					var optionSet,
					    option,
					    options = elem.options,
					    values = jQuery.makeArray(value),
					    i = options.length;

					while (i--) {
						option = options[i];

						/* eslint-disable no-cond-assign */

						if (option.selected = jQuery.inArray(jQuery.valHooks.option.get(option), values) > -1) {
							optionSet = true;
						}

						/* eslint-enable no-cond-assign */
					}

					// Force browsers to behave consistently when non-matching value is set
					if (!optionSet) {
						elem.selectedIndex = -1;
					}
					return values;
				}
			}
		}
	});

	// Radios and checkboxes getter/setter
	jQuery.each(["radio", "checkbox"], function () {
		jQuery.valHooks[this] = {
			set: function set(elem, value) {
				if (Array.isArray(value)) {
					return elem.checked = jQuery.inArray(jQuery(elem).val(), value) > -1;
				}
			}
		};
		if (!support.checkOn) {
			jQuery.valHooks[this].get = function (elem) {
				return elem.getAttribute("value") === null ? "on" : elem.value;
			};
		}
	});

	// Return jQuery for attributes-only inclusion


	var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/;

	jQuery.extend(jQuery.event, {

		trigger: function trigger(event, data, elem, onlyHandlers) {

			var i,
			    cur,
			    tmp,
			    bubbleType,
			    ontype,
			    handle,
			    special,
			    eventPath = [elem || document],
			    type = hasOwn.call(event, "type") ? event.type : event,
			    namespaces = hasOwn.call(event, "namespace") ? event.namespace.split(".") : [];

			cur = tmp = elem = elem || document;

			// Don't do events on text and comment nodes
			if (elem.nodeType === 3 || elem.nodeType === 8) {
				return;
			}

			// focus/blur morphs to focusin/out; ensure we're not firing them right now
			if (rfocusMorph.test(type + jQuery.event.triggered)) {
				return;
			}

			if (type.indexOf(".") > -1) {

				// Namespaced trigger; create a regexp to match event type in handle()
				namespaces = type.split(".");
				type = namespaces.shift();
				namespaces.sort();
			}
			ontype = type.indexOf(":") < 0 && "on" + type;

			// Caller can pass in a jQuery.Event object, Object, or just an event type string
			event = event[jQuery.expando] ? event : new jQuery.Event(type, typeof event === "object" && event);

			// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
			event.isTrigger = onlyHandlers ? 2 : 3;
			event.namespace = namespaces.join(".");
			event.rnamespace = event.namespace ? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") : null;

			// Clean up the event in case it is being reused
			event.result = undefined;
			if (!event.target) {
				event.target = elem;
			}

			// Clone any incoming data and prepend the event, creating the handler arg list
			data = data == null ? [event] : jQuery.makeArray(data, [event]);

			// Allow special events to draw outside the lines
			special = jQuery.event.special[type] || {};
			if (!onlyHandlers && special.trigger && special.trigger.apply(elem, data) === false) {
				return;
			}

			// Determine event propagation path in advance, per W3C events spec (#9951)
			// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
			if (!onlyHandlers && !special.noBubble && !jQuery.isWindow(elem)) {

				bubbleType = special.delegateType || type;
				if (!rfocusMorph.test(bubbleType + type)) {
					cur = cur.parentNode;
				}
				for (; cur; cur = cur.parentNode) {
					eventPath.push(cur);
					tmp = cur;
				}

				// Only add window if we got to document (e.g., not plain obj or detached DOM)
				if (tmp === (elem.ownerDocument || document)) {
					eventPath.push(tmp.defaultView || tmp.parentWindow || window);
				}
			}

			// Fire handlers on the event path
			i = 0;
			while ((cur = eventPath[i++]) && !event.isPropagationStopped()) {

				event.type = i > 1 ? bubbleType : special.bindType || type;

				// jQuery handler
				handle = (dataPriv.get(cur, "events") || {})[event.type] && dataPriv.get(cur, "handle");
				if (handle) {
					handle.apply(cur, data);
				}

				// Native handler
				handle = ontype && cur[ontype];
				if (handle && handle.apply && acceptData(cur)) {
					event.result = handle.apply(cur, data);
					if (event.result === false) {
						event.preventDefault();
					}
				}
			}
			event.type = type;

			// If nobody prevented the default action, do it now
			if (!onlyHandlers && !event.isDefaultPrevented()) {

				if ((!special._default || special._default.apply(eventPath.pop(), data) === false) && acceptData(elem)) {

					// Call a native DOM method on the target with the same name as the event.
					// Don't do default actions on window, that's where global variables be (#6170)
					if (ontype && jQuery.isFunction(elem[type]) && !jQuery.isWindow(elem)) {

						// Don't re-trigger an onFOO event when we call its FOO() method
						tmp = elem[ontype];

						if (tmp) {
							elem[ontype] = null;
						}

						// Prevent re-triggering of the same event, since we already bubbled it above
						jQuery.event.triggered = type;
						elem[type]();
						jQuery.event.triggered = undefined;

						if (tmp) {
							elem[ontype] = tmp;
						}
					}
				}
			}

			return event.result;
		},

		// Piggyback on a donor event to simulate a different one
		// Used only for `focus(in | out)` events
		simulate: function simulate(type, elem, event) {
			var e = jQuery.extend(new jQuery.Event(), event, {
				type: type,
				isSimulated: true
			});

			jQuery.event.trigger(e, null, elem);
		}

	});

	jQuery.fn.extend({

		trigger: function trigger(type, data) {
			return this.each(function () {
				jQuery.event.trigger(type, data, this);
			});
		},
		triggerHandler: function triggerHandler(type, data) {
			var elem = this[0];
			if (elem) {
				return jQuery.event.trigger(type, data, elem, true);
			}
		}
	});

	jQuery.each(("blur focus focusin focusout resize scroll click dblclick " + "mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " + "change select submit keydown keypress keyup contextmenu").split(" "), function (i, name) {

		// Handle event binding
		jQuery.fn[name] = function (data, fn) {
			return arguments.length > 0 ? this.on(name, null, data, fn) : this.trigger(name);
		};
	});

	jQuery.fn.extend({
		hover: function hover(fnOver, fnOut) {
			return this.mouseenter(fnOver).mouseleave(fnOut || fnOver);
		}
	});

	support.focusin = "onfocusin" in window;

	// Support: Firefox <=44
	// Firefox doesn't have focus(in | out) events
	// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
	//
	// Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
	// focus(in | out) events fire after focus & blur events,
	// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
	// Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
	if (!support.focusin) {
		jQuery.each({ focus: "focusin", blur: "focusout" }, function (orig, fix) {

			// Attach a single capturing handler on the document while someone wants focusin/focusout
			var handler = function handler(event) {
				jQuery.event.simulate(fix, event.target, jQuery.event.fix(event));
			};

			jQuery.event.special[fix] = {
				setup: function setup() {
					var doc = this.ownerDocument || this,
					    attaches = dataPriv.access(doc, fix);

					if (!attaches) {
						doc.addEventListener(orig, handler, true);
					}
					dataPriv.access(doc, fix, (attaches || 0) + 1);
				},
				teardown: function teardown() {
					var doc = this.ownerDocument || this,
					    attaches = dataPriv.access(doc, fix) - 1;

					if (!attaches) {
						doc.removeEventListener(orig, handler, true);
						dataPriv.remove(doc, fix);
					} else {
						dataPriv.access(doc, fix, attaches);
					}
				}
			};
		});
	}
	var location = window.location;

	var nonce = jQuery.now();

	var rquery = /\?/;

	// Cross-browser xml parsing
	jQuery.parseXML = function (data) {
		var xml;
		if (!data || typeof data !== "string") {
			return null;
		}

		// Support: IE 9 - 11 only
		// IE throws on parseFromString with invalid input.
		try {
			xml = new window.DOMParser().parseFromString(data, "text/xml");
		} catch (e) {
			xml = undefined;
		}

		if (!xml || xml.getElementsByTagName("parsererror").length) {
			jQuery.error("Invalid XML: " + data);
		}
		return xml;
	};

	var rbracket = /\[\]$/,
	    rCRLF = /\r?\n/g,
	    rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	    rsubmittable = /^(?:input|select|textarea|keygen)/i;

	function buildParams(prefix, obj, traditional, add) {
		var name;

		if (Array.isArray(obj)) {

			// Serialize array item.
			jQuery.each(obj, function (i, v) {
				if (traditional || rbracket.test(prefix)) {

					// Treat each array item as a scalar.
					add(prefix, v);
				} else {

					// Item is non-scalar (array or object), encode its numeric index.
					buildParams(prefix + "[" + (typeof v === "object" && v != null ? i : "") + "]", v, traditional, add);
				}
			});
		} else if (!traditional && jQuery.type(obj) === "object") {

			// Serialize object item.
			for (name in obj) {
				buildParams(prefix + "[" + name + "]", obj[name], traditional, add);
			}
		} else {

			// Serialize scalar item.
			add(prefix, obj);
		}
	}

	// Serialize an array of form elements or a set of
	// key/values into a query string
	jQuery.param = function (a, traditional) {
		var prefix,
		    s = [],
		    add = function add(key, valueOrFunction) {

			// If value is a function, invoke it and use its return value
			var value = jQuery.isFunction(valueOrFunction) ? valueOrFunction() : valueOrFunction;

			s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value == null ? "" : value);
		};

		// If an array was passed in, assume that it is an array of form elements.
		if (Array.isArray(a) || a.jquery && !jQuery.isPlainObject(a)) {

			// Serialize the form elements
			jQuery.each(a, function () {
				add(this.name, this.value);
			});
		} else {

			// If traditional, encode the "old" way (the way 1.3.2 or older
			// did it), otherwise encode params recursively.
			for (prefix in a) {
				buildParams(prefix, a[prefix], traditional, add);
			}
		}

		// Return the resulting serialization
		return s.join("&");
	};

	jQuery.fn.extend({
		serialize: function serialize() {
			return jQuery.param(this.serializeArray());
		},
		serializeArray: function serializeArray() {
			return this.map(function () {

				// Can add propHook for "elements" to filter or add form elements
				var elements = jQuery.prop(this, "elements");
				return elements ? jQuery.makeArray(elements) : this;
			}).filter(function () {
				var type = this.type;

				// Use .is( ":disabled" ) so that fieldset[disabled] works
				return this.name && !jQuery(this).is(":disabled") && rsubmittable.test(this.nodeName) && !rsubmitterTypes.test(type) && (this.checked || !rcheckableType.test(type));
			}).map(function (i, elem) {
				var val = jQuery(this).val();

				if (val == null) {
					return null;
				}

				if (Array.isArray(val)) {
					return jQuery.map(val, function (val) {
						return { name: elem.name, value: val.replace(rCRLF, "\r\n") };
					});
				}

				return { name: elem.name, value: val.replace(rCRLF, "\r\n") };
			}).get();
		}
	});

	var r20 = /%20/g,
	    rhash = /#.*$/,
	    rantiCache = /([?&])_=[^&]*/,
	    rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,


	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	    rnoContent = /^(?:GET|HEAD)$/,
	    rprotocol = /^\/\//,


	/* Prefilters
  * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
  * 2) These are called:
  *    - BEFORE asking for a transport
  *    - AFTER param serialization (s.data is a string if s.processData is true)
  * 3) key is the dataType
  * 4) the catchall symbol "*" can be used
  * 5) execution will start with transport dataType and THEN continue down to "*" if needed
  */
	prefilters = {},


	/* Transports bindings
  * 1) key is the dataType
  * 2) the catchall symbol "*" can be used
  * 3) selection will start with transport dataType and THEN go to "*" if needed
  */
	transports = {},


	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat("*"),


	// Anchor tag for parsing the document origin
	originAnchor = document.createElement("a");
	originAnchor.href = location.href;

	// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
	function addToPrefiltersOrTransports(structure) {

		// dataTypeExpression is optional and defaults to "*"
		return function (dataTypeExpression, func) {

			if (typeof dataTypeExpression !== "string") {
				func = dataTypeExpression;
				dataTypeExpression = "*";
			}

			var dataType,
			    i = 0,
			    dataTypes = dataTypeExpression.toLowerCase().match(rnothtmlwhite) || [];

			if (jQuery.isFunction(func)) {

				// For each dataType in the dataTypeExpression
				while (dataType = dataTypes[i++]) {

					// Prepend if requested
					if (dataType[0] === "+") {
						dataType = dataType.slice(1) || "*";
						(structure[dataType] = structure[dataType] || []).unshift(func);

						// Otherwise append
					} else {
						(structure[dataType] = structure[dataType] || []).push(func);
					}
				}
			}
		};
	}

	// Base inspection function for prefilters and transports
	function inspectPrefiltersOrTransports(structure, options, originalOptions, jqXHR) {

		var inspected = {},
		    seekingTransport = structure === transports;

		function inspect(dataType) {
			var selected;
			inspected[dataType] = true;
			jQuery.each(structure[dataType] || [], function (_, prefilterOrFactory) {
				var dataTypeOrTransport = prefilterOrFactory(options, originalOptions, jqXHR);
				if (typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[dataTypeOrTransport]) {

					options.dataTypes.unshift(dataTypeOrTransport);
					inspect(dataTypeOrTransport);
					return false;
				} else if (seekingTransport) {
					return !(selected = dataTypeOrTransport);
				}
			});
			return selected;
		}

		return inspect(options.dataTypes[0]) || !inspected["*"] && inspect("*");
	}

	// A special extend for ajax options
	// that takes "flat" options (not to be deep extended)
	// Fixes #9887
	function ajaxExtend(target, src) {
		var key,
		    deep,
		    flatOptions = jQuery.ajaxSettings.flatOptions || {};

		for (key in src) {
			if (src[key] !== undefined) {
				(flatOptions[key] ? target : deep || (deep = {}))[key] = src[key];
			}
		}
		if (deep) {
			jQuery.extend(true, target, deep);
		}

		return target;
	}

	/* Handles responses to an ajax request:
  * - finds the right dataType (mediates between content-type and expected dataType)
  * - returns the corresponding response
  */
	function ajaxHandleResponses(s, jqXHR, responses) {

		var ct,
		    type,
		    finalDataType,
		    firstDataType,
		    contents = s.contents,
		    dataTypes = s.dataTypes;

		// Remove auto dataType and get content-type in the process
		while (dataTypes[0] === "*") {
			dataTypes.shift();
			if (ct === undefined) {
				ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
			}
		}

		// Check if we're dealing with a known content-type
		if (ct) {
			for (type in contents) {
				if (contents[type] && contents[type].test(ct)) {
					dataTypes.unshift(type);
					break;
				}
			}
		}

		// Check to see if we have a response for the expected dataType
		if (dataTypes[0] in responses) {
			finalDataType = dataTypes[0];
		} else {

			// Try convertible dataTypes
			for (type in responses) {
				if (!dataTypes[0] || s.converters[type + " " + dataTypes[0]]) {
					finalDataType = type;
					break;
				}
				if (!firstDataType) {
					firstDataType = type;
				}
			}

			// Or just use first one
			finalDataType = finalDataType || firstDataType;
		}

		// If we found a dataType
		// We add the dataType to the list if needed
		// and return the corresponding response
		if (finalDataType) {
			if (finalDataType !== dataTypes[0]) {
				dataTypes.unshift(finalDataType);
			}
			return responses[finalDataType];
		}
	}

	/* Chain conversions given the request and the original response
  * Also sets the responseXXX fields on the jqXHR instance
  */
	function ajaxConvert(s, response, jqXHR, isSuccess) {
		var conv2,
		    current,
		    conv,
		    tmp,
		    prev,
		    converters = {},


		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

		// Create converters map with lowercased keys
		if (dataTypes[1]) {
			for (conv in s.converters) {
				converters[conv.toLowerCase()] = s.converters[conv];
			}
		}

		current = dataTypes.shift();

		// Convert to each sequential dataType
		while (current) {

			if (s.responseFields[current]) {
				jqXHR[s.responseFields[current]] = response;
			}

			// Apply the dataFilter if provided
			if (!prev && isSuccess && s.dataFilter) {
				response = s.dataFilter(response, s.dataType);
			}

			prev = current;
			current = dataTypes.shift();

			if (current) {

				// There's only work to do if current dataType is non-auto
				if (current === "*") {

					current = prev;

					// Convert response if prev dataType is non-auto and differs from current
				} else if (prev !== "*" && prev !== current) {

					// Seek a direct converter
					conv = converters[prev + " " + current] || converters["* " + current];

					// If none found, seek a pair
					if (!conv) {
						for (conv2 in converters) {

							// If conv2 outputs current
							tmp = conv2.split(" ");
							if (tmp[1] === current) {

								// If prev can be converted to accepted input
								conv = converters[prev + " " + tmp[0]] || converters["* " + tmp[0]];
								if (conv) {

									// Condense equivalence converters
									if (conv === true) {
										conv = converters[conv2];

										// Otherwise, insert the intermediate dataType
									} else if (converters[conv2] !== true) {
										current = tmp[0];
										dataTypes.unshift(tmp[1]);
									}
									break;
								}
							}
						}
					}

					// Apply converter (if not an equivalence)
					if (conv !== true) {

						// Unless errors are allowed to bubble, catch and return them
						if (conv && s.throws) {
							response = conv(response);
						} else {
							try {
								response = conv(response);
							} catch (e) {
								return {
									state: "parsererror",
									error: conv ? e : "No conversion from " + prev + " to " + current
								};
							}
						}
					}
				}
			}
		}

		return { state: "success", data: response };
	}

	jQuery.extend({

		// Counter for holding the number of active queries
		active: 0,

		// Last-Modified header cache for next request
		lastModified: {},
		etag: {},

		ajaxSettings: {
			url: location.href,
			type: "GET",
			isLocal: rlocalProtocol.test(location.protocol),
			global: true,
			processData: true,
			async: true,
			contentType: "application/x-www-form-urlencoded; charset=UTF-8",

			/*
   timeout: 0,
   data: null,
   dataType: null,
   username: null,
   password: null,
   cache: null,
   throws: false,
   traditional: false,
   headers: {},
   */

			accepts: {
				"*": allTypes,
				text: "text/plain",
				html: "text/html",
				xml: "application/xml, text/xml",
				json: "application/json, text/javascript"
			},

			contents: {
				xml: /\bxml\b/,
				html: /\bhtml/,
				json: /\bjson\b/
			},

			responseFields: {
				xml: "responseXML",
				text: "responseText",
				json: "responseJSON"
			},

			// Data converters
			// Keys separate source (or catchall "*") and destination types with a single space
			converters: {

				// Convert anything to text
				"* text": String,

				// Text to html (true = no transformation)
				"text html": true,

				// Evaluate text as a json expression
				"text json": JSON.parse,

				// Parse text as xml
				"text xml": jQuery.parseXML
			},

			// For options that shouldn't be deep extended:
			// you can add your own custom options here if
			// and when you create one that shouldn't be
			// deep extended (see ajaxExtend)
			flatOptions: {
				url: true,
				context: true
			}
		},

		// Creates a full fledged settings object into target
		// with both ajaxSettings and settings fields.
		// If target is omitted, writes into ajaxSettings.
		ajaxSetup: function ajaxSetup(target, settings) {
			return settings ?

			// Building a settings object
			ajaxExtend(ajaxExtend(target, jQuery.ajaxSettings), settings) :

			// Extending ajaxSettings
			ajaxExtend(jQuery.ajaxSettings, target);
		},

		ajaxPrefilter: addToPrefiltersOrTransports(prefilters),
		ajaxTransport: addToPrefiltersOrTransports(transports),

		// Main method
		ajax: function ajax(url, options) {

			// If url is an object, simulate pre-1.5 signature
			if (typeof url === "object") {
				options = url;
				url = undefined;
			}

			// Force options to be an object
			options = options || {};

			var transport,


			// URL without anti-cache param
			cacheURL,


			// Response headers
			responseHeadersString,
			    responseHeaders,


			// timeout handle
			timeoutTimer,


			// Url cleanup var
			urlAnchor,


			// Request state (becomes false upon send and true upon completion)
			completed,


			// To know if global events are to be dispatched
			fireGlobals,


			// Loop variable
			i,


			// uncached part of the url
			uncached,


			// Create the final options object
			s = jQuery.ajaxSetup({}, options),


			// Callbacks context
			callbackContext = s.context || s,


			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context && (callbackContext.nodeType || callbackContext.jquery) ? jQuery(callbackContext) : jQuery.event,


			// Deferreds
			deferred = jQuery.Deferred(),
			    completeDeferred = jQuery.Callbacks("once memory"),


			// Status-dependent callbacks
			_statusCode = s.statusCode || {},


			// Headers (they are sent all at once)
			requestHeaders = {},
			    requestHeadersNames = {},


			// Default abort message
			strAbort = "canceled",


			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function getResponseHeader(key) {
					var match;
					if (completed) {
						if (!responseHeaders) {
							responseHeaders = {};
							while (match = rheaders.exec(responseHeadersString)) {
								responseHeaders[match[1].toLowerCase()] = match[2];
							}
						}
						match = responseHeaders[key.toLowerCase()];
					}
					return match == null ? null : match;
				},

				// Raw string
				getAllResponseHeaders: function getAllResponseHeaders() {
					return completed ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function setRequestHeader(name, value) {
					if (completed == null) {
						name = requestHeadersNames[name.toLowerCase()] = requestHeadersNames[name.toLowerCase()] || name;
						requestHeaders[name] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function overrideMimeType(type) {
					if (completed == null) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function statusCode(map) {
					var code;
					if (map) {
						if (completed) {

							// Execute the appropriate callbacks
							jqXHR.always(map[jqXHR.status]);
						} else {

							// Lazy-add the new callbacks in a way that preserves old ones
							for (code in map) {
								_statusCode[code] = [_statusCode[code], map[code]];
							}
						}
					}
					return this;
				},

				// Cancel the request
				abort: function abort(statusText) {
					var finalText = statusText || strAbort;
					if (transport) {
						transport.abort(finalText);
					}
					done(0, finalText);
					return this;
				}
			};

			// Attach deferreds
			deferred.promise(jqXHR);

			// Add protocol if not provided (prefilters might expect it)
			// Handle falsy url in the settings object (#10093: consistency with old signature)
			// We also use the url parameter if available
			s.url = ((url || s.url || location.href) + "").replace(rprotocol, location.protocol + "//");

			// Alias method option to type as per ticket #12004
			s.type = options.method || options.type || s.method || s.type;

			// Extract dataTypes list
			s.dataTypes = (s.dataType || "*").toLowerCase().match(rnothtmlwhite) || [""];

			// A cross-domain request is in order when the origin doesn't match the current origin.
			if (s.crossDomain == null) {
				urlAnchor = document.createElement("a");

				// Support: IE <=8 - 11, Edge 12 - 13
				// IE throws exception on accessing the href property if url is malformed,
				// e.g. http://example.com:80x/
				try {
					urlAnchor.href = s.url;

					// Support: IE <=8 - 11 only
					// Anchor's host property isn't correctly set when s.url is relative
					urlAnchor.href = urlAnchor.href;
					s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !== urlAnchor.protocol + "//" + urlAnchor.host;
				} catch (e) {

					// If there is an error parsing the URL, assume it is crossDomain,
					// it can be rejected by the transport if it is invalid
					s.crossDomain = true;
				}
			}

			// Convert data if not already a string
			if (s.data && s.processData && typeof s.data !== "string") {
				s.data = jQuery.param(s.data, s.traditional);
			}

			// Apply prefilters
			inspectPrefiltersOrTransports(prefilters, s, options, jqXHR);

			// If request was aborted inside a prefilter, stop there
			if (completed) {
				return jqXHR;
			}

			// We can fire global events as of now if asked to
			// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
			fireGlobals = jQuery.event && s.global;

			// Watch for a new set of requests
			if (fireGlobals && jQuery.active++ === 0) {
				jQuery.event.trigger("ajaxStart");
			}

			// Uppercase the type
			s.type = s.type.toUpperCase();

			// Determine if request has content
			s.hasContent = !rnoContent.test(s.type);

			// Save the URL in case we're toying with the If-Modified-Since
			// and/or If-None-Match header later on
			// Remove hash to simplify url manipulation
			cacheURL = s.url.replace(rhash, "");

			// More options handling for requests with no content
			if (!s.hasContent) {

				// Remember the hash so we can put it back
				uncached = s.url.slice(cacheURL.length);

				// If data is available, append data to url
				if (s.data) {
					cacheURL += (rquery.test(cacheURL) ? "&" : "?") + s.data;

					// #9682: remove data so that it's not used in an eventual retry
					delete s.data;
				}

				// Add or update anti-cache param if needed
				if (s.cache === false) {
					cacheURL = cacheURL.replace(rantiCache, "$1");
					uncached = (rquery.test(cacheURL) ? "&" : "?") + "_=" + nonce++ + uncached;
				}

				// Put hash and anti-cache on the URL that will be requested (gh-1732)
				s.url = cacheURL + uncached;

				// Change '%20' to '+' if this is encoded form body content (gh-2658)
			} else if (s.data && s.processData && (s.contentType || "").indexOf("application/x-www-form-urlencoded") === 0) {
				s.data = s.data.replace(r20, "+");
			}

			// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
			if (s.ifModified) {
				if (jQuery.lastModified[cacheURL]) {
					jqXHR.setRequestHeader("If-Modified-Since", jQuery.lastModified[cacheURL]);
				}
				if (jQuery.etag[cacheURL]) {
					jqXHR.setRequestHeader("If-None-Match", jQuery.etag[cacheURL]);
				}
			}

			// Set the correct header, if data is being sent
			if (s.data && s.hasContent && s.contentType !== false || options.contentType) {
				jqXHR.setRequestHeader("Content-Type", s.contentType);
			}

			// Set the Accepts header for the server, depending on the dataType
			jqXHR.setRequestHeader("Accept", s.dataTypes[0] && s.accepts[s.dataTypes[0]] ? s.accepts[s.dataTypes[0]] + (s.dataTypes[0] !== "*" ? ", " + allTypes + "; q=0.01" : "") : s.accepts["*"]);

			// Check for headers option
			for (i in s.headers) {
				jqXHR.setRequestHeader(i, s.headers[i]);
			}

			// Allow custom headers/mimetypes and early abort
			if (s.beforeSend && (s.beforeSend.call(callbackContext, jqXHR, s) === false || completed)) {

				// Abort if not done already and return
				return jqXHR.abort();
			}

			// Aborting is no longer a cancellation
			strAbort = "abort";

			// Install callbacks on deferreds
			completeDeferred.add(s.complete);
			jqXHR.done(s.success);
			jqXHR.fail(s.error);

			// Get transport
			transport = inspectPrefiltersOrTransports(transports, s, options, jqXHR);

			// If no transport, we auto-abort
			if (!transport) {
				done(-1, "No Transport");
			} else {
				jqXHR.readyState = 1;

				// Send global event
				if (fireGlobals) {
					globalEventContext.trigger("ajaxSend", [jqXHR, s]);
				}

				// If request was aborted inside ajaxSend, stop there
				if (completed) {
					return jqXHR;
				}

				// Timeout
				if (s.async && s.timeout > 0) {
					timeoutTimer = window.setTimeout(function () {
						jqXHR.abort("timeout");
					}, s.timeout);
				}

				try {
					completed = false;
					transport.send(requestHeaders, done);
				} catch (e) {

					// Rethrow post-completion exceptions
					if (completed) {
						throw e;
					}

					// Propagate others as results
					done(-1, e);
				}
			}

			// Callback for when everything is done
			function done(status, nativeStatusText, responses, headers) {
				var isSuccess,
				    success,
				    error,
				    response,
				    modified,
				    statusText = nativeStatusText;

				// Ignore repeat invocations
				if (completed) {
					return;
				}

				completed = true;

				// Clear timeout if it exists
				if (timeoutTimer) {
					window.clearTimeout(timeoutTimer);
				}

				// Dereference transport for early garbage collection
				// (no matter how long the jqXHR object will be used)
				transport = undefined;

				// Cache response headers
				responseHeadersString = headers || "";

				// Set readyState
				jqXHR.readyState = status > 0 ? 4 : 0;

				// Determine if successful
				isSuccess = status >= 200 && status < 300 || status === 304;

				// Get response data
				if (responses) {
					response = ajaxHandleResponses(s, jqXHR, responses);
				}

				// Convert no matter what (that way responseXXX fields are always set)
				response = ajaxConvert(s, response, jqXHR, isSuccess);

				// If successful, handle type chaining
				if (isSuccess) {

					// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
					if (s.ifModified) {
						modified = jqXHR.getResponseHeader("Last-Modified");
						if (modified) {
							jQuery.lastModified[cacheURL] = modified;
						}
						modified = jqXHR.getResponseHeader("etag");
						if (modified) {
							jQuery.etag[cacheURL] = modified;
						}
					}

					// if no content
					if (status === 204 || s.type === "HEAD") {
						statusText = "nocontent";

						// if not modified
					} else if (status === 304) {
						statusText = "notmodified";

						// If we have data, let's convert it
					} else {
						statusText = response.state;
						success = response.data;
						error = response.error;
						isSuccess = !error;
					}
				} else {

					// Extract error from statusText and normalize for non-aborts
					error = statusText;
					if (status || !statusText) {
						statusText = "error";
						if (status < 0) {
							status = 0;
						}
					}
				}

				// Set data for the fake xhr object
				jqXHR.status = status;
				jqXHR.statusText = (nativeStatusText || statusText) + "";

				// Success/Error
				if (isSuccess) {
					deferred.resolveWith(callbackContext, [success, statusText, jqXHR]);
				} else {
					deferred.rejectWith(callbackContext, [jqXHR, statusText, error]);
				}

				// Status-dependent callbacks
				jqXHR.statusCode(_statusCode);
				_statusCode = undefined;

				if (fireGlobals) {
					globalEventContext.trigger(isSuccess ? "ajaxSuccess" : "ajaxError", [jqXHR, s, isSuccess ? success : error]);
				}

				// Complete
				completeDeferred.fireWith(callbackContext, [jqXHR, statusText]);

				if (fireGlobals) {
					globalEventContext.trigger("ajaxComplete", [jqXHR, s]);

					// Handle the global AJAX counter
					if (! --jQuery.active) {
						jQuery.event.trigger("ajaxStop");
					}
				}
			}

			return jqXHR;
		},

		getJSON: function getJSON(url, data, callback) {
			return jQuery.get(url, data, callback, "json");
		},

		getScript: function getScript(url, callback) {
			return jQuery.get(url, undefined, callback, "script");
		}
	});

	jQuery.each(["get", "post"], function (i, method) {
		jQuery[method] = function (url, data, callback, type) {

			// Shift arguments if data argument was omitted
			if (jQuery.isFunction(data)) {
				type = type || callback;
				callback = data;
				data = undefined;
			}

			// The url can be an options object (which then must have .url)
			return jQuery.ajax(jQuery.extend({
				url: url,
				type: method,
				dataType: type,
				data: data,
				success: callback
			}, jQuery.isPlainObject(url) && url));
		};
	});

	jQuery._evalUrl = function (url) {
		return jQuery.ajax({
			url: url,

			// Make this explicit, since user can override this through ajaxSetup (#11264)
			type: "GET",
			dataType: "script",
			cache: true,
			async: false,
			global: false,
			"throws": true
		});
	};

	jQuery.fn.extend({
		wrapAll: function wrapAll(html) {
			var wrap;

			if (this[0]) {
				if (jQuery.isFunction(html)) {
					html = html.call(this[0]);
				}

				// The elements to wrap the target around
				wrap = jQuery(html, this[0].ownerDocument).eq(0).clone(true);

				if (this[0].parentNode) {
					wrap.insertBefore(this[0]);
				}

				wrap.map(function () {
					var elem = this;

					while (elem.firstElementChild) {
						elem = elem.firstElementChild;
					}

					return elem;
				}).append(this);
			}

			return this;
		},

		wrapInner: function wrapInner(html) {
			if (jQuery.isFunction(html)) {
				return this.each(function (i) {
					jQuery(this).wrapInner(html.call(this, i));
				});
			}

			return this.each(function () {
				var self = jQuery(this),
				    contents = self.contents();

				if (contents.length) {
					contents.wrapAll(html);
				} else {
					self.append(html);
				}
			});
		},

		wrap: function wrap(html) {
			var isFunction = jQuery.isFunction(html);

			return this.each(function (i) {
				jQuery(this).wrapAll(isFunction ? html.call(this, i) : html);
			});
		},

		unwrap: function unwrap(selector) {
			this.parent(selector).not("body").each(function () {
				jQuery(this).replaceWith(this.childNodes);
			});
			return this;
		}
	});

	jQuery.expr.pseudos.hidden = function (elem) {
		return !jQuery.expr.pseudos.visible(elem);
	};
	jQuery.expr.pseudos.visible = function (elem) {
		return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
	};

	jQuery.ajaxSettings.xhr = function () {
		try {
			return new window.XMLHttpRequest();
		} catch (e) {}
	};

	var xhrSuccessStatus = {

		// File protocol always yields status code 0, assume 200
		0: 200,

		// Support: IE <=9 only
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	    xhrSupported = jQuery.ajaxSettings.xhr();

	support.cors = !!xhrSupported && "withCredentials" in xhrSupported;
	support.ajax = xhrSupported = !!xhrSupported;

	jQuery.ajaxTransport(function (options) {
		var _callback, errorCallback;

		// Cross domain only allowed if supported through XMLHttpRequest
		if (support.cors || xhrSupported && !options.crossDomain) {
			return {
				send: function send(headers, complete) {
					var i,
					    xhr = options.xhr();

					xhr.open(options.type, options.url, options.async, options.username, options.password);

					// Apply custom fields if provided
					if (options.xhrFields) {
						for (i in options.xhrFields) {
							xhr[i] = options.xhrFields[i];
						}
					}

					// Override mime type if needed
					if (options.mimeType && xhr.overrideMimeType) {
						xhr.overrideMimeType(options.mimeType);
					}

					// X-Requested-With header
					// For cross-domain requests, seeing as conditions for a preflight are
					// akin to a jigsaw puzzle, we simply never set it to be sure.
					// (it can always be set on a per-request basis or even using ajaxSetup)
					// For same-domain requests, won't change header if already provided.
					if (!options.crossDomain && !headers["X-Requested-With"]) {
						headers["X-Requested-With"] = "XMLHttpRequest";
					}

					// Set headers
					for (i in headers) {
						xhr.setRequestHeader(i, headers[i]);
					}

					// Callback
					_callback = function callback(type) {
						return function () {
							if (_callback) {
								_callback = errorCallback = xhr.onload = xhr.onerror = xhr.onabort = xhr.onreadystatechange = null;

								if (type === "abort") {
									xhr.abort();
								} else if (type === "error") {

									// Support: IE <=9 only
									// On a manual native abort, IE9 throws
									// errors on any property access that is not readyState
									if (typeof xhr.status !== "number") {
										complete(0, "error");
									} else {
										complete(

										// File: protocol always yields status 0; see #8605, #14207
										xhr.status, xhr.statusText);
									}
								} else {
									complete(xhrSuccessStatus[xhr.status] || xhr.status, xhr.statusText,

									// Support: IE <=9 only
									// IE9 has no XHR2 but throws on binary (trac-11426)
									// For XHR2 non-text, let the caller handle it (gh-2498)
									(xhr.responseType || "text") !== "text" || typeof xhr.responseText !== "string" ? { binary: xhr.response } : { text: xhr.responseText }, xhr.getAllResponseHeaders());
								}
							}
						};
					};

					// Listen to events
					xhr.onload = _callback();
					errorCallback = xhr.onerror = _callback("error");

					// Support: IE 9 only
					// Use onreadystatechange to replace onabort
					// to handle uncaught aborts
					if (xhr.onabort !== undefined) {
						xhr.onabort = errorCallback;
					} else {
						xhr.onreadystatechange = function () {

							// Check readyState before timeout as it changes
							if (xhr.readyState === 4) {

								// Allow onerror to be called first,
								// but that will not handle a native abort
								// Also, save errorCallback to a variable
								// as xhr.onerror cannot be accessed
								window.setTimeout(function () {
									if (_callback) {
										errorCallback();
									}
								});
							}
						};
					}

					// Create the abort callback
					_callback = _callback("abort");

					try {

						// Do send the request (this may raise an exception)
						xhr.send(options.hasContent && options.data || null);
					} catch (e) {

						// #14683: Only rethrow if this hasn't been notified as an error yet
						if (_callback) {
							throw e;
						}
					}
				},

				abort: function abort() {
					if (_callback) {
						_callback();
					}
				}
			};
		}
	});

	// Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
	jQuery.ajaxPrefilter(function (s) {
		if (s.crossDomain) {
			s.contents.script = false;
		}
	});

	// Install script dataType
	jQuery.ajaxSetup({
		accepts: {
			script: "text/javascript, application/javascript, " + "application/ecmascript, application/x-ecmascript"
		},
		contents: {
			script: /\b(?:java|ecma)script\b/
		},
		converters: {
			"text script": function textScript(text) {
				jQuery.globalEval(text);
				return text;
			}
		}
	});

	// Handle cache's special case and crossDomain
	jQuery.ajaxPrefilter("script", function (s) {
		if (s.cache === undefined) {
			s.cache = false;
		}
		if (s.crossDomain) {
			s.type = "GET";
		}
	});

	// Bind script tag hack transport
	jQuery.ajaxTransport("script", function (s) {

		// This transport only deals with cross domain requests
		if (s.crossDomain) {
			var script, _callback2;
			return {
				send: function send(_, complete) {
					script = jQuery("<script>").prop({
						charset: s.scriptCharset,
						src: s.url
					}).on("load error", _callback2 = function callback(evt) {
						script.remove();
						_callback2 = null;
						if (evt) {
							complete(evt.type === "error" ? 404 : 200, evt.type);
						}
					});

					// Use native DOM manipulation to avoid our domManip AJAX trickery
					document.head.appendChild(script[0]);
				},
				abort: function abort() {
					if (_callback2) {
						_callback2();
					}
				}
			};
		}
	});

	var oldCallbacks = [],
	    rjsonp = /(=)\?(?=&|$)|\?\?/;

	// Default jsonp settings
	jQuery.ajaxSetup({
		jsonp: "callback",
		jsonpCallback: function jsonpCallback() {
			var callback = oldCallbacks.pop() || jQuery.expando + "_" + nonce++;
			this[callback] = true;
			return callback;
		}
	});

	// Detect, normalize options and install callbacks for jsonp requests
	jQuery.ajaxPrefilter("json jsonp", function (s, originalSettings, jqXHR) {

		var callbackName,
		    overwritten,
		    responseContainer,
		    jsonProp = s.jsonp !== false && (rjsonp.test(s.url) ? "url" : typeof s.data === "string" && (s.contentType || "").indexOf("application/x-www-form-urlencoded") === 0 && rjsonp.test(s.data) && "data");

		// Handle iff the expected data type is "jsonp" or we have a parameter to set
		if (jsonProp || s.dataTypes[0] === "jsonp") {

			// Get callback name, remembering preexisting value associated with it
			callbackName = s.jsonpCallback = jQuery.isFunction(s.jsonpCallback) ? s.jsonpCallback() : s.jsonpCallback;

			// Insert callback into url or form data
			if (jsonProp) {
				s[jsonProp] = s[jsonProp].replace(rjsonp, "$1" + callbackName);
			} else if (s.jsonp !== false) {
				s.url += (rquery.test(s.url) ? "&" : "?") + s.jsonp + "=" + callbackName;
			}

			// Use data converter to retrieve json after script execution
			s.converters["script json"] = function () {
				if (!responseContainer) {
					jQuery.error(callbackName + " was not called");
				}
				return responseContainer[0];
			};

			// Force json dataType
			s.dataTypes[0] = "json";

			// Install callback
			overwritten = window[callbackName];
			window[callbackName] = function () {
				responseContainer = arguments;
			};

			// Clean-up function (fires after converters)
			jqXHR.always(function () {

				// If previous value didn't exist - remove it
				if (overwritten === undefined) {
					jQuery(window).removeProp(callbackName);

					// Otherwise restore preexisting value
				} else {
					window[callbackName] = overwritten;
				}

				// Save back as free
				if (s[callbackName]) {

					// Make sure that re-using the options doesn't screw things around
					s.jsonpCallback = originalSettings.jsonpCallback;

					// Save the callback name for future use
					oldCallbacks.push(callbackName);
				}

				// Call if it was a function and we have a response
				if (responseContainer && jQuery.isFunction(overwritten)) {
					overwritten(responseContainer[0]);
				}

				responseContainer = overwritten = undefined;
			});

			// Delegate to script
			return "script";
		}
	});

	// Support: Safari 8 only
	// In Safari 8 documents created via document.implementation.createHTMLDocument
	// collapse sibling forms: the second one becomes a child of the first one.
	// Because of that, this security measure has to be disabled in Safari 8.
	// https://bugs.webkit.org/show_bug.cgi?id=137337
	support.createHTMLDocument = function () {
		var body = document.implementation.createHTMLDocument("").body;
		body.innerHTML = "<form></form><form></form>";
		return body.childNodes.length === 2;
	}();

	// Argument "data" should be string of html
	// context (optional): If specified, the fragment will be created in this context,
	// defaults to document
	// keepScripts (optional): If true, will include scripts passed in the html string
	jQuery.parseHTML = function (data, context, keepScripts) {
		if (typeof data !== "string") {
			return [];
		}
		if (typeof context === "boolean") {
			keepScripts = context;
			context = false;
		}

		var base, parsed, scripts;

		if (!context) {

			// Stop scripts or inline event handlers from being executed immediately
			// by using document.implementation
			if (support.createHTMLDocument) {
				context = document.implementation.createHTMLDocument("");

				// Set the base href for the created document
				// so any parsed elements with URLs
				// are based on the document's URL (gh-2965)
				base = context.createElement("base");
				base.href = document.location.href;
				context.head.appendChild(base);
			} else {
				context = document;
			}
		}

		parsed = rsingleTag.exec(data);
		scripts = !keepScripts && [];

		// Single tag
		if (parsed) {
			return [context.createElement(parsed[1])];
		}

		parsed = buildFragment([data], context, scripts);

		if (scripts && scripts.length) {
			jQuery(scripts).remove();
		}

		return jQuery.merge([], parsed.childNodes);
	};

	/**
  * Load a url into a page
  */
	jQuery.fn.load = function (url, params, callback) {
		var selector,
		    type,
		    response,
		    self = this,
		    off = url.indexOf(" ");

		if (off > -1) {
			selector = stripAndCollapse(url.slice(off));
			url = url.slice(0, off);
		}

		// If it's a function
		if (jQuery.isFunction(params)) {

			// We assume that it's the callback
			callback = params;
			params = undefined;

			// Otherwise, build a param string
		} else if (params && typeof params === "object") {
			type = "POST";
		}

		// If we have elements to modify, make the request
		if (self.length > 0) {
			jQuery.ajax({
				url: url,

				// If "type" variable is undefined, then "GET" method will be used.
				// Make value of this field explicit since
				// user can override it through ajaxSetup method
				type: type || "GET",
				dataType: "html",
				data: params
			}).done(function (responseText) {

				// Save response for use in complete callback
				response = arguments;

				self.html(selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery("<div>").append(jQuery.parseHTML(responseText)).find(selector) :

				// Otherwise use the full result
				responseText);

				// If the request succeeds, this function gets "data", "status", "jqXHR"
				// but they are ignored because response was set above.
				// If it fails, this function gets "jqXHR", "status", "error"
			}).always(callback && function (jqXHR, status) {
				self.each(function () {
					callback.apply(this, response || [jqXHR.responseText, status, jqXHR]);
				});
			});
		}

		return this;
	};

	// Attach a bunch of functions for handling common AJAX events
	jQuery.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function (i, type) {
		jQuery.fn[type] = function (fn) {
			return this.on(type, fn);
		};
	});

	jQuery.expr.pseudos.animated = function (elem) {
		return jQuery.grep(jQuery.timers, function (fn) {
			return elem === fn.elem;
		}).length;
	};

	jQuery.offset = {
		setOffset: function setOffset(elem, options, i) {
			var curPosition,
			    curLeft,
			    curCSSTop,
			    curTop,
			    curOffset,
			    curCSSLeft,
			    calculatePosition,
			    position = jQuery.css(elem, "position"),
			    curElem = jQuery(elem),
			    props = {};

			// Set position first, in-case top/left are set even on static elem
			if (position === "static") {
				elem.style.position = "relative";
			}

			curOffset = curElem.offset();
			curCSSTop = jQuery.css(elem, "top");
			curCSSLeft = jQuery.css(elem, "left");
			calculatePosition = (position === "absolute" || position === "fixed") && (curCSSTop + curCSSLeft).indexOf("auto") > -1;

			// Need to be able to calculate position if either
			// top or left is auto and position is either absolute or fixed
			if (calculatePosition) {
				curPosition = curElem.position();
				curTop = curPosition.top;
				curLeft = curPosition.left;
			} else {
				curTop = parseFloat(curCSSTop) || 0;
				curLeft = parseFloat(curCSSLeft) || 0;
			}

			if (jQuery.isFunction(options)) {

				// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
				options = options.call(elem, i, jQuery.extend({}, curOffset));
			}

			if (options.top != null) {
				props.top = options.top - curOffset.top + curTop;
			}
			if (options.left != null) {
				props.left = options.left - curOffset.left + curLeft;
			}

			if ("using" in options) {
				options.using.call(elem, props);
			} else {
				curElem.css(props);
			}
		}
	};

	jQuery.fn.extend({
		offset: function offset(options) {

			// Preserve chaining for setter
			if (arguments.length) {
				return options === undefined ? this : this.each(function (i) {
					jQuery.offset.setOffset(this, options, i);
				});
			}

			var doc,
			    docElem,
			    rect,
			    win,
			    elem = this[0];

			if (!elem) {
				return;
			}

			// Return zeros for disconnected and hidden (display: none) elements (gh-2310)
			// Support: IE <=11 only
			// Running getBoundingClientRect on a
			// disconnected node in IE throws an error
			if (!elem.getClientRects().length) {
				return { top: 0, left: 0 };
			}

			rect = elem.getBoundingClientRect();

			doc = elem.ownerDocument;
			docElem = doc.documentElement;
			win = doc.defaultView;

			return {
				top: rect.top + win.pageYOffset - docElem.clientTop,
				left: rect.left + win.pageXOffset - docElem.clientLeft
			};
		},

		position: function position() {
			if (!this[0]) {
				return;
			}

			var offsetParent,
			    offset,
			    elem = this[0],
			    parentOffset = { top: 0, left: 0 };

			// Fixed elements are offset from window (parentOffset = {top:0, left: 0},
			// because it is its only offset parent
			if (jQuery.css(elem, "position") === "fixed") {

				// Assume getBoundingClientRect is there when computed position is fixed
				offset = elem.getBoundingClientRect();
			} else {

				// Get *real* offsetParent
				offsetParent = this.offsetParent();

				// Get correct offsets
				offset = this.offset();
				if (!nodeName(offsetParent[0], "html")) {
					parentOffset = offsetParent.offset();
				}

				// Add offsetParent borders
				parentOffset = {
					top: parentOffset.top + jQuery.css(offsetParent[0], "borderTopWidth", true),
					left: parentOffset.left + jQuery.css(offsetParent[0], "borderLeftWidth", true)
				};
			}

			// Subtract parent offsets and element margins
			return {
				top: offset.top - parentOffset.top - jQuery.css(elem, "marginTop", true),
				left: offset.left - parentOffset.left - jQuery.css(elem, "marginLeft", true)
			};
		},

		// This method will return documentElement in the following cases:
		// 1) For the element inside the iframe without offsetParent, this method will return
		//    documentElement of the parent window
		// 2) For the hidden or detached element
		// 3) For body or html element, i.e. in case of the html node - it will return itself
		//
		// but those exceptions were never presented as a real life use-cases
		// and might be considered as more preferable results.
		//
		// This logic, however, is not guaranteed and can change at any point in the future
		offsetParent: function offsetParent() {
			return this.map(function () {
				var offsetParent = this.offsetParent;

				while (offsetParent && jQuery.css(offsetParent, "position") === "static") {
					offsetParent = offsetParent.offsetParent;
				}

				return offsetParent || documentElement;
			});
		}
	});

	// Create scrollLeft and scrollTop methods
	jQuery.each({ scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function (method, prop) {
		var top = "pageYOffset" === prop;

		jQuery.fn[method] = function (val) {
			return access(this, function (elem, method, val) {

				// Coalesce documents and windows
				var win;
				if (jQuery.isWindow(elem)) {
					win = elem;
				} else if (elem.nodeType === 9) {
					win = elem.defaultView;
				}

				if (val === undefined) {
					return win ? win[prop] : elem[method];
				}

				if (win) {
					win.scrollTo(!top ? val : win.pageXOffset, top ? val : win.pageYOffset);
				} else {
					elem[method] = val;
				}
			}, method, val, arguments.length);
		};
	});

	// Support: Safari <=7 - 9.1, Chrome <=37 - 49
	// Add the top/left cssHooks using jQuery.fn.position
	// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
	// Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
	// getComputedStyle returns percent when specified for top/left/bottom/right;
	// rather than make the css module depend on the offset module, just check for it here
	jQuery.each(["top", "left"], function (i, prop) {
		jQuery.cssHooks[prop] = addGetHookIf(support.pixelPosition, function (elem, computed) {
			if (computed) {
				computed = curCSS(elem, prop);

				// If curCSS returns percentage, fallback to offset
				return rnumnonpx.test(computed) ? jQuery(elem).position()[prop] + "px" : computed;
			}
		});
	});

	// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
	jQuery.each({ Height: "height", Width: "width" }, function (name, type) {
		jQuery.each({ padding: "inner" + name, content: type, "": "outer" + name }, function (defaultExtra, funcName) {

			// Margin is only for outerHeight, outerWidth
			jQuery.fn[funcName] = function (margin, value) {
				var chainable = arguments.length && (defaultExtra || typeof margin !== "boolean"),
				    extra = defaultExtra || (margin === true || value === true ? "margin" : "border");

				return access(this, function (elem, type, value) {
					var doc;

					if (jQuery.isWindow(elem)) {

						// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
						return funcName.indexOf("outer") === 0 ? elem["inner" + name] : elem.document.documentElement["client" + name];
					}

					// Get document width or height
					if (elem.nodeType === 9) {
						doc = elem.documentElement;

						// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
						// whichever is greatest
						return Math.max(elem.body["scroll" + name], doc["scroll" + name], elem.body["offset" + name], doc["offset" + name], doc["client" + name]);
					}

					return value === undefined ?

					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css(elem, type, extra) :

					// Set width or height on the element
					jQuery.style(elem, type, value, extra);
				}, type, chainable ? margin : undefined, chainable);
			};
		});
	});

	jQuery.fn.extend({

		bind: function bind(types, data, fn) {
			return this.on(types, null, data, fn);
		},
		unbind: function unbind(types, fn) {
			return this.off(types, null, fn);
		},

		delegate: function delegate(selector, types, data, fn) {
			return this.on(types, selector, data, fn);
		},
		undelegate: function undelegate(selector, types, fn) {

			// ( namespace ) or ( selector, types [, fn] )
			return arguments.length === 1 ? this.off(selector, "**") : this.off(types, selector || "**", fn);
		}
	});

	jQuery.holdReady = function (hold) {
		if (hold) {
			jQuery.readyWait++;
		} else {
			jQuery.ready(true);
		}
	};
	jQuery.isArray = Array.isArray;
	jQuery.parseJSON = JSON.parse;
	jQuery.nodeName = nodeName;

	// Register as a named AMD module, since jQuery can be concatenated with other
	// files that may use define, but not via a proper concatenation script that
	// understands anonymous AMD modules. A named AMD is safest and most robust
	// way to register. Lowercase jquery is used because AMD module names are
	// derived from file names, and jQuery is normally delivered in a lowercase
	// file name. Do this after creating the global so that if an AMD module wants
	// to call noConflict to hide this version of jQuery, it will work.

	// Note that for maximum portability, libraries that are not jQuery should
	// declare themselves as anonymous modules, and avoid setting a global if an
	// AMD loader is present. jQuery is a special case. For more information, see
	// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

	if (typeof define === "function" && define.amd) {
		define("jquery", [], function () {
			return jQuery;
		});
	}

	var

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,


	// Map over the $ in case of overwrite
	_$ = window.$;

	jQuery.noConflict = function (deep) {
		if (window.$ === jQuery) {
			window.$ = _$;
		}

		if (deep && window.jQuery === jQuery) {
			window.jQuery = _jQuery;
		}

		return jQuery;
	};

	// Expose jQuery and $ identifiers, even in AMD
	// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
	// and CommonJS for browser emulators (#13566)
	if (!noGlobal) {
		window.jQuery = window.$ = jQuery;
	}

	return jQuery;
});

const app = new App();
const containerElement = document.getElementById('app');
setPropertyDidChange(() => {
    app.scheduleRerender();
});
app.registerInitializer({
    initialize(registry) {
        registry.register(`component-manager:/${app.rootName}/component-managers/main`, ComponentManager);
    }
});
app.renderComponent('front-app', containerElement, null);
app.boot();

})));

//# sourceMappingURL=app.js.map
