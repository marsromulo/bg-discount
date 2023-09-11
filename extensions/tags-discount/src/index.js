// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";


/**
* @typedef {import("../generated/api").InputQuery} InputQuery
* @typedef {import("../generated/api").FunctionResult} FunctionResult
* @typedef {import("../generated/api").Target} Target
* @typedef {import("../generated/api").ProductVariant} ProductVariant
*/

/**
* @type {FunctionResult}
*/
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.Maximum,
  discounts: [],
};


export default /**
* @param {InputQuery} input
* @returns {FunctionResult}
*/
  (input) => {
    // Define a type for your configuration, and parse it from the metafield
    /**
    * @type {{
    *  quantity: number
    *  percentage: number
    *  value: number
    *  customerRequiresTag: boolean
    *  tag_type: string
    * }}
    */
    const configuration = JSON.parse(
      input?.discountNode?.metafield?.value ?? "{}"
    );

    if ((!configuration.quantity && !configuration.percentage) || (!configuration.quantity && !configuration.value)) {
      return EMPTY_DISCOUNT;
    }

    const customerHasTag = input?.cart?.buyerIdentity?.customer?.hasAnyTag ?? false;

    // tag not required for customer
    let targets1= input.cart.lines
      .filter(line => 
       line.quantity >= configuration.quantity && 
       line.merchandise.__typename == "ProductVariant" && 
       line.merchandise.product.hasAnyTag === true && 
       configuration.tag_type == "product"
       )
      .map( line  => {
        const variant = /** @type {ProductVariant} */ (line.merchandise);  
        return /** @type {Target} */ ({
          productVariant: {
            id: variant.id
          }
        });
      });

      // tag required for customer
      let targets2= input.cart.lines
      .filter(line => 
       line.quantity >= configuration.quantity && 
       line.merchandise.__typename == "ProductVariant" && 
       customerHasTag && 
       configuration.tag_type == "customer"
       )
      .map( line  => {
        const variant = /** @type {ProductVariant} */ (line.merchandise);  
        return /** @type {Target} */ ({
          productVariant: {
            id: variant.id
          }
        });
      });

      // tag required for customer
      let targets3= input.cart.lines
      .filter(line => 
       line.quantity >= configuration.quantity && 
       line.merchandise.__typename == "ProductVariant" && 
       line.merchandise.product.hasAnyTag === true && 
       customerHasTag && 
       configuration.tag_type == "product_customer"
       )
      .map( line  => {
        const variant = /** @type {ProductVariant} */ (line.merchandise);  
        return /** @type {Target} */ ({
          productVariant: {
            id: variant.id
          }
        });
      });
    
    const targets = targets1.concat(targets2, targets3);

    // const _discount_value_amount = (Math.round(configuration.value * 100) / 100).toFixed(2) ;

    const discount_value = {
      fixedAmount: {
        amount: (Math.round(configuration.value * 100) / 100).toFixed(2) 
      }
    }

    const discount_percentage = {
      percentage: {
        value: configuration.percentage.toString()
      }
    }

    return {
      discounts: [
        {
          targets,
          value: configuration.percentage ? discount_percentage : discount_value
        }
      ],
      discountApplicationStrategy: DiscountApplicationStrategy.Maximum
    };
  };
