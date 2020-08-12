const express = require("express");


/*---Function Area---*/
//Generate new size code {S:1, M:2...}
function sizeResult(result) {
    let sizeData = {};

    for (i = 0; i < result.length; i++) {
        let size = result[i].size;
        let id = result[i].id;
        sizeData[size] = id;
    }
    return sizeData;
}

//convert size_name to s_id
function get_size_ids(size_names, size_mapping) {
    let result = [];
    let sizeArray = size_names.split(', '); // convert string into array and split strings on comma space
    for (i = 0; i < sizeArray.length; i++) {
        result.push(size_mapping[sizeArray[i]]);
    }
    return result;
}

//Generate product_size table data [[1,2],[1,3],[1,4]]
function generate_product_size(p_id, size_id_list) {
    let result = [];
    for (let i = 0; i < size_id_list.length; i++) {
        result.push([p_id, size_id_list[i]]);
    }
    return result;
}

// Generate new color code {id:1, name: white}>>>{white:1, pink:2...}
function colorResult(result) {
    let colorData = {};

    for (let i = 0; i < result.length; i++) {
        let color = result[i].name;
        let id = result[i].id;
        colorData[color] = id;
    }
    return colorData;
}

// Generate product_variant table data
function generate_product_variant(p_id, size_id_list, color_id_list, stock) {
    let result = [];
    for (let i = 0; i < size_id_list.length; i++) {
        for (let j = 0; j < color_id_list.length; j++) {
            result.push([p_id, size_id_list[i], color_id_list[j], stock]);
        }
    }
    return result;
} // [[1,1,1], [1,1,2], [1,1,3]]

// Split image
function split_otherImages(image) {
    let result = [];
    for (let i = 0; i < image.otherImages.length; i++) {
        result.push([image.otherImages[i].filename]);
    }
    return result;
}

// Generate product_img table
function generate_product_img(p_id, other_image) {
    let result = [];
    for (let i = 0; i < other_image.length; i++) {
        result.push([p_id, other_image[i]]);
    }
    return result;
}

// reverse sizeMap
function reverse_sizeMap(Map) {
    let result = {};
    let keys = Object.keys(Map); //[S, M, L]
    // let values = Object.values(Map); //[1, 2, 3] 
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        result[Map[key]] = keys[i]; //Map[0] = 1 >>新key
    }
    return result;
}

// Reverse colorMap
function reverse_colorMap(Map, colorTemplate) {
    //colorTemplate = [{ id: 1, code: 'FFFFFF', name: 'white' },...]
    //Map = {white:1, pink:2...}
    let result = {};
    let keys = Object.keys(Map)//[white, pink, ...]
    for (let i = 0; i < keys.length; i++) {
        for (let j = 0; j < colorTemplate.length; j++) {
            let key = keys[i];
            result[Map[key]] = {}
            result[Map[key]].code = colorTemplate[i].code;
            result[Map[key]].name = colorTemplate[i].name;
        }
        //{ 1:{code:"ffffff", name:"white"}, ...}
    }
    return result;
}


// Reform Response Object
function reform_response_object(productData, sizeData, sizeMap, colorData, colorMap, colorTemplate, variantData, imageData) {
    let result = {};
    for (let i = 0; i < productData.length; i++) {
        /*---Main_image Reform---*/
        productData[i]['main_image'] = `http://3.23.162.33/${productData[i].main_image}`

        /*---Size Reform---*/
        //sizeData = [{ id: 76, p_id: 1, size_id: '1' },...]
        //sizeMap = {S:1, M:2, L:3...}
        //r_sizeMap = {1:S, 2:M, 3:L, ...}
        //sizeResult = ['S', 'M', 'L'...]
        let sizeResult = [];
        let reversed_sizeMap = reverse_sizeMap(sizeMap);
        for (let j = 0; j < sizeData.length; j++) {
            if (productData[i].id == sizeData[j].p_id) {
                sizeResult.push(reversed_sizeMap[sizeData[j].size_id]);
            }
        }
        productData[i]['sizes'] = sizeResult;

        /*---Color Reform---*/
        // colorData = [{ id: 18, p_id: 1, color_id: 1 },...]
        // colorMap = {white:1, pink:2...}
        // r_colorMap = {'1': { code: 'FFFFFF', name: 'white' },'2': { code: 'FFDDDD', name: 'pink' }...}
        // colorTemplate = [{ id: 1, code: 'FFFFFF', name: 'white' },...] // SELECT * FROM color;
        // colorResult = [{code:'334455', name:'深藍'}]

        let colorResult = [];
        let reversed_colorMap = reverse_colorMap(colorMap, colorTemplate);
        for (let j = 0; j < colorData.length; j++) {
            if (productData[i].id == colorData[j].p_id) {
                let colorItem = {};
                let code_name_pair = reversed_colorMap[colorData[j].color_id];
                colorItem['code'] = code_name_pair.code;
                colorItem['name'] = code_name_pair.name;
                colorResult.push(colorItem);
            }
        }
        productData[i]['colors'] = colorResult;

        /*---Variant Reform---*/
        // variantData = [{id: 120,p_id: 1,size_id: 1,color_id: 1,stock: 20},...]
        // r_sizeMap = {1:S, 2:M, 3:L, ...}
        // r_colorMap = {1:{name:"white", code:"FFFFFF"}, 2: {name:"pink", code:"FFDDFF"}...}
        // variantResult = [{color_code:"334455", size:"S", stock:5}, ...]
        let variantResult = [];
        let variantItem = {};
        for (let j = 0; j < variantData.length; j++) {
            if (productData[i].id == variantData[j].p_id) {
                variantItem = {};
                variantItem['size'] = reversed_sizeMap[variantData[j].size_id];
                variantItem['color_code'] = reversed_colorMap[variantData[j].color_id].code;
                variantItem['stock'] = variantData[j].stock;
                variantResult.push(variantItem);
            }
        }
        productData[i]['variants'] = variantResult;

        /*---Other_image Reform---*/
        // imageData = [{id: 7,p_id: 1,other_image: 'd158b63708326ac3212b2cffe4dab10a'},...]
        // imageResult = ['https://stylish.com/0.jpg', 'https://stylish.com/1.jpg', 'https://stylish.com/2.jpg']
        let imageResult = [];
        for (let j = 0; j < imageData.length; j++) {
            if (productData[i].id == imageData[j].p_id) {
                imageResult.push(`https://3.23.162.33/${imageData[j].other_image}`);
            }
        }
        productData[i]['images'] = imageResult;
    }
    result['data'] = productData;
    return result;
}

module.exports = {  //1. 為什麼我沒有export出去，在其他files也可以用這些function？ //2. 有沒有更簡化的寫法？
    sizeResult: sizeResult,
    get_size_ids: get_size_ids,
    generate_product_size: generate_product_size,
    colorResult: colorResult,
    generate_product_variant: generate_product_variant,
    split_otherImages: split_otherImages,
    generate_product_img: generate_product_img,
    reverse_sizeMap: reverse_sizeMap,
    reverse_colorMap: reverse_colorMap,
    reform_response_object: reform_response_object
}
