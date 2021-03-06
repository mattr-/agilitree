//fswatch test/tree.js test/tree-children.js | xargs -n1 -I{} mocha --compilers js:babel-register

import { uniqueId } from 'lodash';
import {
  logAdd,
  logAddBelow,
  logAddAbove,
  logAddRight,
  logCut,
  replay,
  getAbove,
  getSiblingAbove,
  getSiblingBelow,
  getRightOf,
  getFirstRightOf,
  top,
  bottom
} from '../client/tree.js';
import assert from 'assert';
import { fromJS } from 'immutable';
import Guid from 'guid';

function areSame(l, r) {
  assert.ok(
    fromJS(l).equals(fromJS(r)),
    `${JSON.stringify(l, null, 2)} and ${JSON.stringify(r, null, 2)} are not equal.`);
}

function newRow(text) {
  return { id: uniqueId(Guid.raw().substring(0, 8)), text }
}

function initialState() {
  return [ ];
}

describe('tree children', function() {
  specify('adding children', function() {
    var row1 = newRow('root');
    var row2 = newRow('foo');

    var logs = logAdd(initialState(), row1);
    logs = logAddRight(logs, row1.id, row2);

    var expectedStructure = [
      { id: row1.id, text: row1.text, order: 1, parentId: null },
      { id: row2.id, text: row2.text, order: 1, parentId: row1.id }
    ];

    var tree = replay(logs);
    areSame(tree, expectedStructure);

    var right = getRightOf(tree, row1.id);

    var expectedRight = [
      { id: row2.id, text: row2.text, order: 1, parentId: row1.id }
    ];

    areSame(right, expectedRight);

    var firstRight = getFirstRightOf(tree, row1.id);
    var expectedFirstRight = {
      id: row2.id,
      text: row2.text,
      order: 1,
      parentId: row1.id
    };

    areSame(firstRight, expectedFirstRight);
  });

  specify('cut child only affects sibling nodes', function() {
    var row1 = newRow('./root');
    var row2 = newRow('./root/child');
    var row3 = newRow('./root/child2');
    var row4 = newRow('./foo');

    var logs = logAdd(initialState(), row1);
    logs = logAddRight(logs, row1.id, row2);
    logs = logAddBelow(logs, row2.id, row3);
    logs = logAddBelow(logs, row1.id, row4);

    var expectedStructure = [
      { id: row1.id, text: row1.text, order: 1, parentId: null },
      { id: row4.id, text: row4.text, order: 2, parentId: null },
      { id: row2.id, text: row2.text, order: 1, parentId: row1.id },
      { id: row3.id, text: row3.text, order: 2, parentId: row1.id }
    ];

    areSame(replay(logs), expectedStructure);

    logs = logCut(logs, row2.id);

    expectedStructure = [
      { id: row1.id, text: row1.text, order: 1, parentId: null },
      { id: row4.id, text: row4.text, order: 2, parentId: null },
      { id: row3.id, text: row3.text, order: 1, parentId: row1.id }
    ]

    areSame(replay(logs), expectedStructure);
  });

  describe('adding multiple children', function() {
    var root = newRow('root');
    var child1 = newRow('./root/child1');
    var child2 = newRow('./root/child2');
    var child3 = newRow('./root/child3');

    specify('right', function() {
      var logs = logAdd(initialState(), root);
      logs = logAddRight(logs, root.id, child1);
      logs = logAddRight(logs, root.id, child2);
      logs = logAddRight(logs, root.id, child3);

      var tree = replay(logs);
      assert.equal(getSiblingAbove(tree, child3.id).id, child2.id);
      assert.equal(getSiblingAbove(tree, child2.id).id, child1.id);
      assert.equal(getSiblingAbove(tree, child1.id), null);
    });

    specify('below', function() {
      var logs = logAdd(initialState(), root);
      logs = logAddRight(logs, root.id, child1);
      logs = logAddBelow(logs, child1.id, child2);
      logs = logAddBelow(logs, child2.id, child3);

      var tree = replay(logs);
      assert.equal(getSiblingAbove(tree, child3.id).id, child2.id);
      assert.equal(getSiblingAbove(tree, child2.id).id, child1.id);
      assert.equal(getSiblingAbove(tree, child1.id), null);
    });

    specify('above', function() {
      var logs = logAdd(initialState(), root);
      logs = logAddRight(logs, root.id, child3);
      logs = logAddAbove(logs, child3.id, child2);
      logs = logAddAbove(logs, child2.id, child1);

      var tree = replay(logs);
      assert.equal(getSiblingAbove(tree, child3.id).id, child2.id);
      assert.equal(getSiblingAbove(tree, child2.id).id, child1.id);
      assert.equal(getSiblingAbove(tree, child1.id), null);
    });
  });

  specify('top of current', function() {
    var row1 = newRow('./root');
    var row2 = newRow('./root/child');
    var row3 = newRow('./root/child2');
    var row4 = newRow('./foo');

    var logs = logAdd(initialState(), row1);
    logs = logAddBelow(logs, row1.id, row4);
    logs = logAddRight(logs, row1.id, row2);
    logs = logAddBelow(logs, row2.id, row3);

    var tree = replay(logs);
    assert.equal(top(tree, row4.id).id, row1.id);
    assert.equal(top(tree, row3.id).id, row2.id);
  });

  specify('bottom of current', function() {
    var row1 = newRow('./root');
    var row2 = newRow('./root/child');
    var row3 = newRow('./root/child2');
    var row4 = newRow('./foo');

    var logs = logAdd(initialState(), row1);
    logs = logAddBelow(logs, row1.id, row4);
    logs = logAddRight(logs, row1.id, row2);
    logs = logAddBelow(logs, row2.id, row3);

    var tree = replay(logs);
    assert.equal(bottom(tree, row1.id).id, row4.id);
    assert.equal(bottom(tree, row2.id).id, row3.id);
  });

  specify('previous sibling for parent with children', function() {
    var row1 = newRow('./root');
    var row2 = newRow('./root/child');
    var row3 = newRow('./root/child2');
    var row4 = newRow('./foo');

    var logs = logAdd(initialState(), row1);
    logs = logAddBelow(logs, row1.id, row4);
    logs = logAddRight(logs, row1.id, row2);
    logs = logAddBelow(logs, row2.id, row3);

    var tree = replay(logs);
    assert.equal(getSiblingAbove(tree, row1.id), null);
    assert.equal(getSiblingAbove(tree, row2.id), null);
    assert.equal(getSiblingAbove(tree, row3.id).id, row2.id);
    assert.equal(getSiblingAbove(tree, row4.id).id, row1.id);
  });

  specify('next sibling for parent with children', function() {
    var row1 = newRow('./root');
    var row2 = newRow('./root/child');
    var row3 = newRow('./root/child2');
    var row4 = newRow('./foo');

    var logs = logAdd(initialState(), row1);
    logs = logAddBelow(logs, row1.id, row4);
    logs = logAddRight(logs, row1.id, row2);
    logs = logAddBelow(logs, row2.id, row3);

    var tree = replay(logs);
    assert.equal(getSiblingBelow(tree, row1.id).id, row4.id);
    assert.equal(getSiblingBelow(tree, row2.id).id, row3.id);
    assert.equal(getSiblingBelow(tree, row3.id), null);
    assert.equal(getSiblingBelow(tree, row4.id), null);
  });

  specify('next sibling for parent with children', function() {
    var row1 = newRow('./root');
    var row2 = newRow('./root/child');
    var row3 = newRow('./root/child2');
    var row4 = newRow('./foo');

    var logs = logAdd(initialState(), row1);
    logs = logAddBelow(logs, row1.id, row4);
    logs = logAddRight(logs, row1.id, row2);
    logs = logAddBelow(logs, row2.id, row3);

    var tree = replay(logs);
    assert.equal(getSiblingBelow(tree, row1.id).id, row4.id);
    assert.equal(getSiblingBelow(tree, row2.id).id, row3.id);
    assert.equal(getSiblingBelow(tree, row3.id), null);
    assert.equal(getSiblingBelow(tree, row4.id), null);
  });
});
