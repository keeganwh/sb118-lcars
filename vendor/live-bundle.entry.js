// The entry file the committed `live-bundle.js` is built from.
//
// NOT loaded by the app. The app loads the BUILT file, `../live-bundle.js`.
// This exists so the bundle is reproducible rather than a mystery blob: it
// names every library that goes in and every name that comes out.
//
// Everything is hung off ONE global, `window.LCARSLive`, so the bundle adds
// exactly one name to the page and lcars.js reads it like any other object.
// Nothing here is imported by lcars.js; there are no modules in this project.
import * as Y from 'yjs';
import {
  ySyncPlugin, yCursorPlugin, yUndoPlugin, undo, redo,
  prosemirrorToYXmlFragment, yXmlFragmentToProsemirrorJSON,
} from 'y-prosemirror';
import { Schema, DOMParser as PMDOMParser, DOMSerializer } from 'prosemirror-model';
import { EditorState, TextSelection, Plugin, PluginKey } from 'prosemirror-state';
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark, chainCommands } from 'prosemirror-commands';
import { history, undo as pmUndo, redo as pmRedo } from 'prosemirror-history';

window.LCARSLive = {
  // The CRDT. Y.Doc, Y.XmlFragment, encodeStateAsUpdate, applyUpdate ...
  Y,
  // The Yjs <-> ProseMirror binding.
  ySyncPlugin, yCursorPlugin, yUndoPlugin, undo, redo,
  prosemirrorToYXmlFragment, yXmlFragmentToProsemirrorJSON,
  // The editor.
  Schema, PMDOMParser, DOMSerializer, EditorState, TextSelection, EditorView,
  Plugin, PluginKey, Decoration, DecorationSet,
  keymap, baseKeymap, toggleMark, chainCommands, history, pmUndo, pmRedo,
};
