"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ThreadFilterType = exports.ThreadEvent = exports.Thread = exports.THREAD_RELATION_TYPE = exports.FeatureSupport = exports.FILTER_RELATED_BY_SENDERS = exports.FILTER_RELATED_BY_REL_TYPES = void 0;
exports.determineFeatureSupport = determineFeatureSupport;
exports.threadFilterTypeToFilter = threadFilterTypeToFilter;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _client = require("../client");
var _ReEmitter = require("../ReEmitter");
var _event = require("../@types/event");
var _event2 = require("./event");
var _eventTimeline = require("./event-timeline");
var _eventTimelineSet = require("./event-timeline-set");
var _room = require("./room");
var _NamespacedValue = require("../NamespacedValue");
var _logger = require("../logger");
var _readReceipt = require("./read-receipt");
var _read_receipts = require("../@types/read_receipts");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
let ThreadEvent;
exports.ThreadEvent = ThreadEvent;
(function (ThreadEvent) {
  ThreadEvent["New"] = "Thread.new";
  ThreadEvent["Update"] = "Thread.update";
  ThreadEvent["NewReply"] = "Thread.newReply";
  ThreadEvent["ViewThread"] = "Thread.viewThread";
  ThreadEvent["Delete"] = "Thread.delete";
})(ThreadEvent || (exports.ThreadEvent = ThreadEvent = {}));
let FeatureSupport;
exports.FeatureSupport = FeatureSupport;
(function (FeatureSupport) {
  FeatureSupport[FeatureSupport["None"] = 0] = "None";
  FeatureSupport[FeatureSupport["Experimental"] = 1] = "Experimental";
  FeatureSupport[FeatureSupport["Stable"] = 2] = "Stable";
})(FeatureSupport || (exports.FeatureSupport = FeatureSupport = {}));
function determineFeatureSupport(stable, unstable) {
  if (stable) {
    return FeatureSupport.Stable;
  } else if (unstable) {
    return FeatureSupport.Experimental;
  } else {
    return FeatureSupport.None;
  }
}

/**
 * @experimental
 */
class Thread extends _readReceipt.ReadReceipt {
  /**
   * A reference to all the events ID at the bottom of the threads
   */

  /**
   * An array of events to add to the timeline once the thread has been initialised
   * with server suppport.
   */

  constructor(id, rootEvent, opts) {
    var _opts$pendingEventOrd;
    super();
    this.id = id;
    this.rootEvent = rootEvent;
    (0, _defineProperty2.default)(this, "timelineSet", void 0);
    (0, _defineProperty2.default)(this, "timeline", []);
    (0, _defineProperty2.default)(this, "_currentUserParticipated", false);
    (0, _defineProperty2.default)(this, "reEmitter", void 0);
    (0, _defineProperty2.default)(this, "lastEvent", void 0);
    (0, _defineProperty2.default)(this, "replyCount", 0);
    (0, _defineProperty2.default)(this, "lastPendingEvent", void 0);
    (0, _defineProperty2.default)(this, "pendingReplyCount", 0);
    (0, _defineProperty2.default)(this, "room", void 0);
    (0, _defineProperty2.default)(this, "client", void 0);
    (0, _defineProperty2.default)(this, "pendingEventOrdering", void 0);
    (0, _defineProperty2.default)(this, "initialEventsFetched", !Thread.hasServerSideSupport);
    (0, _defineProperty2.default)(this, "replayEvents", []);
    (0, _defineProperty2.default)(this, "onBeforeRedaction", (event, redaction) => {
      if (event !== null && event !== void 0 && event.isRelation(THREAD_RELATION_TYPE.name) && this.room.eventShouldLiveIn(event).threadId === this.id && event.getId() !== this.id &&
      // the root event isn't counted in the length so ignore this redaction
      !redaction.status // only respect it when it succeeds
      ) {
        this.replyCount--;
        this.updatePendingReplyCount();
        this.emit(ThreadEvent.Update, this);
      }
    });
    (0, _defineProperty2.default)(this, "onRedaction", async event => {
      if (event.threadRootId !== this.id) return; // ignore redactions for other timelines
      if (this.replyCount <= 0) {
        for (const threadEvent of this.timeline) {
          this.clearEventMetadata(threadEvent);
        }
        this.lastEvent = this.rootEvent;
        this._currentUserParticipated = false;
        this.emit(ThreadEvent.Delete, this);
      } else {
        await this.updateThreadMetadata();
      }
    });
    (0, _defineProperty2.default)(this, "onTimelineEvent", (event, room, toStartOfTimeline) => {
      // Add a synthesized receipt when paginating forward in the timeline
      if (!toStartOfTimeline) {
        room.addLocalEchoReceipt(event.getSender(), event, _read_receipts.ReceiptType.Read);
      }
      this.onEcho(event, toStartOfTimeline !== null && toStartOfTimeline !== void 0 ? toStartOfTimeline : false);
    });
    (0, _defineProperty2.default)(this, "onLocalEcho", event => {
      this.onEcho(event, false);
    });
    (0, _defineProperty2.default)(this, "onEcho", async (event, toStartOfTimeline) => {
      if (event.threadRootId !== this.id) return; // ignore echoes for other timelines
      if (this.lastEvent === event) return; // ignore duplicate events
      await this.updateThreadMetadata();
      if (!event.isRelation(THREAD_RELATION_TYPE.name)) return; // don't send a new reply event for reactions or edits
      if (toStartOfTimeline) return; // ignore messages added to the start of the timeline
      this.emit(ThreadEvent.NewReply, this, event);
    });
    if (!(opts !== null && opts !== void 0 && opts.room)) {
      // Logging/debugging for https://github.com/vector-im/element-web/issues/22141
      // Hope is that we end up with a more obvious stack trace.
      throw new Error("element-web#22141: A thread requires a room in order to function");
    }
    this.room = opts.room;
    this.client = opts.client;
    this.pendingEventOrdering = (_opts$pendingEventOrd = opts.pendingEventOrdering) !== null && _opts$pendingEventOrd !== void 0 ? _opts$pendingEventOrd : _client.PendingEventOrdering.Chronological;
    this.timelineSet = new _eventTimelineSet.EventTimelineSet(this.room, {
      timelineSupport: true,
      pendingEvents: true
    }, this.client, this);
    this.reEmitter = new _ReEmitter.TypedReEmitter(this);
    this.reEmitter.reEmit(this.timelineSet, [_room.RoomEvent.Timeline, _room.RoomEvent.TimelineReset]);
    this.room.on(_event2.MatrixEventEvent.BeforeRedaction, this.onBeforeRedaction);
    this.room.on(_room.RoomEvent.Redaction, this.onRedaction);
    this.room.on(_room.RoomEvent.LocalEchoUpdated, this.onLocalEcho);
    this.timelineSet.on(_room.RoomEvent.Timeline, this.onTimelineEvent);
    this.processReceipts(opts.receipts);

    // even if this thread is thought to be originating from this client, we initialise it as we may be in a
    // gappy sync and a thread around this event may already exist.
    this.updateThreadMetadata();
    this.setEventMetadata(this.rootEvent);
  }
  async fetchRootEvent() {
    this.rootEvent = this.room.findEventById(this.id);
    // If the rootEvent does not exist in the local stores, then fetch it from the server.
    try {
      const eventData = await this.client.fetchRoomEvent(this.roomId, this.id);
      const mapper = this.client.getEventMapper();
      this.rootEvent = mapper(eventData); // will merge with existing event object if such is known
    } catch (e) {
      _logger.logger.error("Failed to fetch thread root to construct thread with", e);
    }
    await this.processEvent(this.rootEvent);
  }
  static setServerSideSupport(status) {
    Thread.hasServerSideSupport = status;
    if (status !== FeatureSupport.Stable) {
      FILTER_RELATED_BY_SENDERS.setPreferUnstable(true);
      FILTER_RELATED_BY_REL_TYPES.setPreferUnstable(true);
      THREAD_RELATION_TYPE.setPreferUnstable(true);
    }
  }
  static setServerSideListSupport(status) {
    Thread.hasServerSideListSupport = status;
  }
  static setServerSideFwdPaginationSupport(status) {
    Thread.hasServerSideFwdPaginationSupport = status;
  }
  get roomState() {
    return this.room.getLiveTimeline().getState(_eventTimeline.EventTimeline.FORWARDS);
  }
  addEventToTimeline(event, toStartOfTimeline) {
    if (!this.findEventById(event.getId())) {
      this.timelineSet.addEventToTimeline(event, this.liveTimeline, {
        toStartOfTimeline,
        fromCache: false,
        roomState: this.roomState
      });
      this.timeline = this.events;
    }
  }
  addEvents(events, toStartOfTimeline) {
    events.forEach(ev => this.addEvent(ev, toStartOfTimeline, false));
    this.updateThreadMetadata();
  }

  /**
   * Add an event to the thread and updates
   * the tail/root references if needed
   * Will fire "Thread.update"
   * @param event - The event to add
   * @param toStartOfTimeline - whether the event is being added
   * to the start (and not the end) of the timeline.
   * @param emit - whether to emit the Update event if the thread was updated or not.
   */
  async addEvent(event, toStartOfTimeline, emit = true) {
    this.setEventMetadata(event);
    const lastReply = this.lastReply();
    const isNewestReply = !lastReply || event.localTimestamp > lastReply.localTimestamp;

    // Add all incoming events to the thread's timeline set when there's  no server support
    if (!Thread.hasServerSideSupport) {
      // all the relevant membership info to hydrate events with a sender
      // is held in the main room timeline
      // We want to fetch the room state from there and pass it down to this thread
      // timeline set to let it reconcile an event with its relevant RoomMember
      this.addEventToTimeline(event, toStartOfTimeline);
      this.client.decryptEventIfNeeded(event, {});
    } else if (!toStartOfTimeline && this.initialEventsFetched && isNewestReply) {
      this.addEventToTimeline(event, false);
      this.fetchEditsWhereNeeded(event);
    } else if (event.isRelation(_event.RelationType.Annotation) || event.isRelation(_event.RelationType.Replace)) {
      var _this$timelineSet$rel, _this$timelineSet$rel2;
      if (!this.initialEventsFetched) {
        var _this$replayEvents;
        /**
         * A thread can be fully discovered via a single sync response
         * And when that's the case we still ask the server to do an initialisation
         * as it's the safest to ensure we have everything.
         * However when we are in that scenario we might loose annotation or edits
         *
         * This fix keeps a reference to those events and replay them once the thread
         * has been initialised properly.
         */
        (_this$replayEvents = this.replayEvents) === null || _this$replayEvents === void 0 ? void 0 : _this$replayEvents.push(event);
      } else {
        this.addEventToTimeline(event, toStartOfTimeline);
      }
      // Apply annotations and replace relations to the relations of the timeline only
      (_this$timelineSet$rel = this.timelineSet.relations) === null || _this$timelineSet$rel === void 0 ? void 0 : _this$timelineSet$rel.aggregateParentEvent(event);
      (_this$timelineSet$rel2 = this.timelineSet.relations) === null || _this$timelineSet$rel2 === void 0 ? void 0 : _this$timelineSet$rel2.aggregateChildEvent(event, this.timelineSet);
      return;
    }

    // If no thread support exists we want to count all thread relation
    // added as a reply. We can't rely on the bundled relationships count
    if ((!Thread.hasServerSideSupport || !this.rootEvent) && event.isRelation(THREAD_RELATION_TYPE.name)) {
      this.replyCount++;
    }
    if (emit) {
      this.emit(ThreadEvent.NewReply, this, event);
      this.updateThreadMetadata();
    }
  }
  async processEvent(event) {
    if (event) {
      this.setEventMetadata(event);
      await this.fetchEditsWhereNeeded(event);
    }
    this.timeline = this.events;
  }

  /**
   * Processes the receipts that were caught during initial sync
   * When clients become aware of a thread, they try to retrieve those read receipts
   * and apply them to the current thread
   * @param receipts - A collection of the receipts cached from initial sync
   */
  processReceipts(receipts = []) {
    for (const {
      event,
      synthetic
    } of receipts) {
      const content = event.getContent();
      Object.keys(content).forEach(eventId => {
        Object.keys(content[eventId]).forEach(receiptType => {
          Object.keys(content[eventId][receiptType]).forEach(userId => {
            const receipt = content[eventId][receiptType][userId];
            this.addReceiptToStructure(eventId, receiptType, userId, receipt, synthetic);
          });
        });
      });
    }
  }
  getRootEventBundledRelationship(rootEvent = this.rootEvent) {
    return rootEvent === null || rootEvent === void 0 ? void 0 : rootEvent.getServerAggregatedRelation(THREAD_RELATION_TYPE.name);
  }
  async processRootEvent() {
    const bundledRelationship = this.getRootEventBundledRelationship();
    if (Thread.hasServerSideSupport && bundledRelationship) {
      this.replyCount = bundledRelationship.count;
      this._currentUserParticipated = !!bundledRelationship.current_user_participated;
      const mapper = this.client.getEventMapper();
      // re-insert roomId
      this.lastEvent = mapper(_objectSpread(_objectSpread({}, bundledRelationship.latest_event), {}, {
        room_id: this.roomId
      }));
      this.updatePendingReplyCount();
      await this.processEvent(this.lastEvent);
    }
  }
  updatePendingReplyCount() {
    const unfilteredPendingEvents = this.pendingEventOrdering === _client.PendingEventOrdering.Detached ? this.room.getPendingEvents() : this.events;
    const pendingEvents = unfilteredPendingEvents.filter(ev => {
      var _this$lastEvent;
      return ev.threadRootId === this.id && ev.isRelation(THREAD_RELATION_TYPE.name) && ev.status !== null && ev.getId() !== ((_this$lastEvent = this.lastEvent) === null || _this$lastEvent === void 0 ? void 0 : _this$lastEvent.getId());
    });
    this.lastPendingEvent = pendingEvents.length ? pendingEvents[pendingEvents.length - 1] : undefined;
    this.pendingReplyCount = pendingEvents.length;
  }
  async updateThreadMetadata() {
    this.updatePendingReplyCount();
    if (Thread.hasServerSideSupport) {
      // Ensure we show *something* as soon as possible, we'll update it as soon as we get better data, but we
      // don't want the thread preview to be empty if we can avoid it
      if (!this.initialEventsFetched) {
        await this.processRootEvent();
      }
      await this.fetchRootEvent();
    }
    await this.processRootEvent();
    if (!this.initialEventsFetched) {
      this.initialEventsFetched = true;
      // fetch initial event to allow proper pagination
      try {
        // if the thread has regular events, this will just load the last reply.
        // if the thread is newly created, this will load the root event.
        if (this.replyCount === 0 && this.rootEvent) {
          this.timelineSet.addEventsToTimeline([this.rootEvent], true, this.liveTimeline, null);
          this.liveTimeline.setPaginationToken(null, _eventTimeline.Direction.Backward);
        } else {
          await this.client.paginateEventTimeline(this.liveTimeline, {
            backwards: true,
            limit: Math.max(1, this.length)
          });
        }
        for (const event of this.replayEvents) {
          this.addEvent(event, false);
        }
        this.replayEvents = null;
        // just to make sure that, if we've created a timeline window for this thread before the thread itself
        // existed (e.g. when creating a new thread), we'll make sure the panel is force refreshed correctly.
        this.emit(_room.RoomEvent.TimelineReset, this.room, this.timelineSet, true);
      } catch (e) {
        _logger.logger.error("Failed to load start of newly created thread: ", e);
        this.initialEventsFetched = false;
      }
    }
    this.emit(ThreadEvent.Update, this);
  }

  // XXX: Workaround for https://github.com/matrix-org/matrix-spec-proposals/pull/2676/files#r827240084
  async fetchEditsWhereNeeded(...events) {
    return Promise.all(events.filter(e => e.isEncrypted()).map(event => {
      if (event.isRelation()) return; // skip - relations don't get edits
      return this.client.relations(this.roomId, event.getId(), _event.RelationType.Replace, event.getType(), {
        limit: 1
      }).then(relations => {
        if (relations.events.length) {
          event.makeReplaced(relations.events[0]);
        }
      }).catch(e => {
        _logger.logger.error("Failed to load edits for encrypted thread event", e);
      });
    }));
  }
  setEventMetadata(event) {
    if (event) {
      _eventTimeline.EventTimeline.setEventMetadata(event, this.roomState, false);
      event.setThread(this);
    }
  }
  clearEventMetadata(event) {
    if (event) {
      var _event$event, _event$event$unsigned, _event$event$unsigned2;
      event.setThread(undefined);
      (_event$event = event.event) === null || _event$event === void 0 ? true : (_event$event$unsigned = _event$event.unsigned) === null || _event$event$unsigned === void 0 ? true : (_event$event$unsigned2 = _event$event$unsigned["m.relations"]) === null || _event$event$unsigned2 === void 0 ? true : delete _event$event$unsigned2[THREAD_RELATION_TYPE.name];
    }
  }

  /**
   * Finds an event by ID in the current thread
   */
  findEventById(eventId) {
    return this.timelineSet.findEventById(eventId);
  }

  /**
   * Return last reply to the thread, if known.
   */
  lastReply(matches = () => true) {
    for (let i = this.timeline.length - 1; i >= 0; i--) {
      const event = this.timeline[i];
      if (matches(event)) {
        return event;
      }
    }
    return null;
  }
  get roomId() {
    return this.room.roomId;
  }

  /**
   * The number of messages in the thread
   * Only count rel_type=m.thread as we want to
   * exclude annotations from that number
   */
  get length() {
    return this.replyCount + this.pendingReplyCount;
  }

  /**
   * A getter for the last event of the thread.
   * This might be a synthesized event, if so, it will not emit any events to listeners.
   */
  get replyToEvent() {
    var _ref, _this$lastPendingEven;
    return (_ref = (_this$lastPendingEven = this.lastPendingEvent) !== null && _this$lastPendingEven !== void 0 ? _this$lastPendingEven : this.lastEvent) !== null && _ref !== void 0 ? _ref : this.lastReply();
  }
  get events() {
    return this.liveTimeline.getEvents();
  }
  has(eventId) {
    return this.timelineSet.findEventById(eventId) instanceof _event2.MatrixEvent;
  }
  get hasCurrentUserParticipated() {
    return this._currentUserParticipated;
  }
  get liveTimeline() {
    return this.timelineSet.getLiveTimeline();
  }
  getUnfilteredTimelineSet() {
    return this.timelineSet;
  }
  addReceipt(event, synthetic) {
    throw new Error("Unsupported function on the thread model");
  }
  hasUserReadEvent(userId, eventId) {
    if (userId === this.client.getUserId()) {
      const publicReadReceipt = this.getReadReceiptForUserId(userId, false, _read_receipts.ReceiptType.Read);
      const privateReadReceipt = this.getReadReceiptForUserId(userId, false, _read_receipts.ReceiptType.ReadPrivate);
      const hasUnreads = this.room.getThreadUnreadNotificationCount(this.id, _room.NotificationCountType.Total) > 0;
      if (!publicReadReceipt && !privateReadReceipt && !hasUnreads) {
        // Consider an event read if it's part of a thread that has no
        // read receipts and has no notifications. It is likely that it is
        // part of a thread that was created before read receipts for threads
        // were supported (via MSC3771)
        return true;
      }
    }
    return super.hasUserReadEvent(userId, eventId);
  }
}
exports.Thread = Thread;
(0, _defineProperty2.default)(Thread, "hasServerSideSupport", FeatureSupport.None);
(0, _defineProperty2.default)(Thread, "hasServerSideListSupport", FeatureSupport.None);
(0, _defineProperty2.default)(Thread, "hasServerSideFwdPaginationSupport", FeatureSupport.None);
const FILTER_RELATED_BY_SENDERS = new _NamespacedValue.ServerControlledNamespacedValue("related_by_senders", "io.element.relation_senders");
exports.FILTER_RELATED_BY_SENDERS = FILTER_RELATED_BY_SENDERS;
const FILTER_RELATED_BY_REL_TYPES = new _NamespacedValue.ServerControlledNamespacedValue("related_by_rel_types", "io.element.relation_types");
exports.FILTER_RELATED_BY_REL_TYPES = FILTER_RELATED_BY_REL_TYPES;
const THREAD_RELATION_TYPE = new _NamespacedValue.ServerControlledNamespacedValue("m.thread", "io.element.thread");
exports.THREAD_RELATION_TYPE = THREAD_RELATION_TYPE;
let ThreadFilterType;
exports.ThreadFilterType = ThreadFilterType;
(function (ThreadFilterType) {
  ThreadFilterType[ThreadFilterType["My"] = 0] = "My";
  ThreadFilterType[ThreadFilterType["All"] = 1] = "All";
})(ThreadFilterType || (exports.ThreadFilterType = ThreadFilterType = {}));
function threadFilterTypeToFilter(type) {
  switch (type) {
    case ThreadFilterType.My:
      return "participated";
    default:
      return "all";
  }
}
//# sourceMappingURL=thread.js.map