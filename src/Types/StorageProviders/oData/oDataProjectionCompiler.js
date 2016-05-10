import $data, { $C, Guard, Container, Exception, MemberDefinition } from 'jaydata/core';

$C('$data.storageProviders.oData.oDataProjectionCompiler', $data.Expressions.EntityExpressionVisitor, null, {
    constructor: function (provider) {
        this.provider = provider; 
        this.entityContext = provider.context;
        this.hasObjectLiteral = false;
        this.modelBinderMapping = [];
    },

    compile: function (expression, context) {
        this.Visit(expression, context);
    },
    VisitProjectionExpression: function (expression, context) {
        ///<summary></summary>
        ///<param name="expression" type="$data.Expressions.ProjectionExpression" mayBeNull="false"></param>
        ///<param name="context" mayBeNull="false"></param>
        context.data = "";
        this.mapping = "";

        this.Visit(expression.selector, context);
        if (context['$select']) { context['$select'] += ','; } else { context['$select'] = ''; }
        context["$select"] += context.data;
        context.data = "";
    },
    VisitParametricQueryExpression: function (expression, context) {
        this.Visit(expression.expression, context);
        var m = this.mapping.split('.');
        
        if (!(expression.expression instanceof $data.Expressions.EntityExpression) && !(expression.expression instanceof $data.Expressions.EntitySetExpression)) {
            m.pop();
        }
        
        if (m.length > 0) {
            if(!context['$expand'] || !(context['$expand'] instanceof $data.storageProviders.oData.ODataIncludeFragment)){
                context['$expand'] = new $data.storageProviders.oData.ODataIncludeFragment();
            }
            context['$expand'].addInclude(m.join('.'))
        }
    },
    VisitObjectLiteralExpression: function (expression, context) {
        ///<summary></summary>
        ///<param name="expression" type="$data.Expressions.ObjectLiteralExpression" mayBeNull="false"></param>
        ///<param name="context" mayBeNull="false"></param>
        
        this.hasObjectLiteral = true;
        expression.members.forEach(function (member, index) {
            this.Visit(member, context);
            if (index < expression.members.length - 1) { context.data += ','; }
            this.mapping = '';
        }, this);
    },
    VisitObjectFieldExpression: function (expression, context) {
        this.Visit(expression.expression, context);
        
        var m = this.mapping.split('.');
        var propertyName = "";
        if (!(expression.expression instanceof $data.Expressions.EntityExpression) && !(expression.expression instanceof $data.Expressions.EntitySetExpression)) {
            propertyName = m.pop();
        }

        if (m.length > 0) {
            if(!context['$expand'] || !(context['$expand'] instanceof $data.storageProviders.oData.ODataIncludeFragment)){
                context['$expand'] = new $data.storageProviders.oData.ODataIncludeFragment();
            }
            
            if(expression.expression instanceof $data.Expressions.EntityFieldExpression && expression.expression.selector instanceof $data.Expressions.MemberInfoExpression){
                var storageModel = this.entityContext._storageModel.getStorageModel(expression.expression.selector.memberDefinition.definedBy)
                if(!storageModel) return;
                
                var isComplexProperty = storageModel && !!storageModel.ComplexTypes[expression.memberName];
                if(isComplexProperty){
                    var complexProperty = m.pop();
                    context['$expand'].addImplicitMap(m.join('.'), complexProperty);
                    return;
                }
            }
            
            
            if (expression.expression instanceof $data.Expressions.ComplexTypeExpression) {
                context['$expand'].addImplicitMap(m.join('.'), propertyName);
            } else {
                context['$expand'].addInclude(m.join('.'))
            }
        }
    },

    VisitComplexTypeExpression: function (expression, context) {
        this.Visit(expression.source, context);
        this.Visit(expression.selector, context);
    },

    VisitEntityFieldExpression: function (expression, context) {
        this.Visit(expression.source, context);
        this.Visit(expression.selector, context);
    },
    VisitEntityExpression: function (expression, context) {
        ///<summary></summary>
        ///<param name="expression" type="$data.Expressions.EntityExpression" mayBeNull="false"></param>
        ///<param name="context" mayBeNull="false"></param>
        this.Visit(expression.source, context);
    },
    VisitEntitySetExpression: function (expression, context) {
        ///<summary></summary>
        ///<param name="expression" type="$data.Expressions.EntitySetExpression" mayBeNull="false"></param>
        ///<param name="context" mayBeNull="false"></param>
        if (expression.source instanceof $data.Expressions.EntityExpression) {
            this.Visit(expression.source, context);
        }
        if (expression.selector instanceof $data.Expressions.AssociationInfoExpression) {
            this.Visit(expression.selector, context);
        }
    },
    VisitAssociationInfoExpression: function (expression, context) {
        if (this.mapping && this.mapping.length > 0) { this.mapping += '.'; }
        this.mapping += expression.associationInfo.FromPropertyName;
        
        if (context.data && context.data.length > 0 && context.data[context.data.length - 1] != ',') { 
            if(!context['$expand'] || !(context['$expand'] instanceof $data.storageProviders.oData.ODataIncludeFragment)){
                context['$expand'] = new $data.storageProviders.oData.ODataIncludeFragment();
            }
            context['$expand'].addInclude(this.mapping)
        } else {
            context.data += expression.associationInfo.FromPropertyName;
        }

    },
    VisitMemberInfoExpression: function (expression, context) {
        var storageModel = this.entityContext._storageModel.getStorageModel(expression.memberDefinition.definedBy)
        var isComplexProperty = storageModel && !!storageModel.ComplexTypes[expression.memberName];
        var isComplexField = !storageModel;
        
        if (context.data && context.data.length > 0 && context.data[context.data.length - 1] != ',') {
            if(this.mapping){
                if(!context['$expand'] || !(context['$expand'] instanceof $data.storageProviders.oData.ODataIncludeFragment)){
                    context['$expand'] = new $data.storageProviders.oData.ODataIncludeFragment();
                }
                if(isComplexField){
                    var m = this.mapping.split('.');
                    var complexProperty = m.pop();
                    if(this.provider.checkODataMode("disableCompltexTypeMapping")){
                        context['$expand'].addImplicitMap(m.join('.'), complexProperty);
                    } else {
                        context['$expand'].addImplicitMap(m.join('.'), complexProperty + "/" + expression.memberName);
                    }
                } else if(!isComplexProperty) {
                    context['$expand'].addImplicitMap(this.mapping, expression.memberName);
                }
            } 
        } else {
            //if(context.data[context.data.length - 1] != ',') context.data += '/';
            context.data += expression.memberName;
        }
        
        if (this.mapping && this.mapping.length > 0) { this.mapping += '.'; }
        this.mapping += expression.memberName;        
    },
    VisitConstantExpression: function (expression, context) {
        //Guard.raise(new Exception('Constant value is not supported in Projection.', 'Not supported!'));
        //context.data += expression.value;
		context.data = context.data.slice(0, context.data.length - 1);
    }
});
