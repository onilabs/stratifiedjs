@ = require(['sjs:test/suite']);
@docutil = require('sjs:docutil');

@context('parsing comments') {||
  @test('only extracts fields that are aligned with the initial indent level') {||
    @docutil.extractDocFields(["
      @key val
      @desc
        A description involving indented docs:
          @indented
      @key2 val2
    "]) .. @assert.eq([
      ['key', 'val'],
      ['desc', 'A description involving indented docs:\n  @indented',],
      ['key2', 'val2'],
    ]);
  }

  @test('escaping of end-comments') {||
    @docutil.extractDocComments("/**comment with multiple *\\/ end (*\\/) bits*/")
    .. @assert.eq(["comment with multiple */ end (*/) bits"]);
  }
}
    
@context('@type') {||
  @test('module type overrides default type') { ||
    @docutil.parseModuleDocs("/**
    @type doc
    */").type .. @assert.eq('doc');
  }

  @test('variable type is assigned to `vartype`') { ||
    @docutil.parseModuleDocs("/**
    @variable a
    @type String
    */").children .. @assert.eq({
      a: {
        type: 'variable',
        valtype: 'String'
      },
    });
  }
}
