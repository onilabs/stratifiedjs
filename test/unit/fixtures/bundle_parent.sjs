/**
  @require ./annotated_child1
  @require ./annotated_child2
 */
var dyn = './synamic_dependency';
@ = require(['./merge_child1', {id: './merge_child2', exclude: 'map'}, dyn, {id:dyn}]);

