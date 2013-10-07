/**
  @require ./annotated_child1
  @require ./annotated_child2
 */
@ = require.merge('./merge_child1', {id: './merge_child2', exclude: 'map'});

