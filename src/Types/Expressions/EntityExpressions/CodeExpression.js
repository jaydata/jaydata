import $data, { $C, Guard, Container, Exception } from '../../../TypeSystem/index.js';

$C('$data.Expressions.CodeExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (source, parameters) {
        if (Container.resolveType(Container.getTypeName(source)) == $data.String && 
            source.replace(/^[\s\xA0]+/, "").match("^function") != "function" && 
             !/^[^\.]*(=>)/.test(source.replace(/^[\s\xA0]+/, ""))) 
        {
            source = "function (it) { return " + source + "; }";
        }

        this.source = source;
        this.parameters = parameters;
    },
    nodeType: { value: $data.Expressions.ExpressionType.Code, enumerable: true }
});

export default $data
