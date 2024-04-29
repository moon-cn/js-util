import {storage} from "./storage";
import axios from "axios";

export const http = {}


const axiosInstance = axios.create({
    withCredentials: true, // 带cookie
    baseURL: '/',
})

const AUTH_STORE_KEYS = ['jwt', 'appToken', 'token', 'Authorization'];

function getToken() {
    for (let key of AUTH_STORE_KEYS) {
        let v = localStorage.getItem(key);
        if (v) {
            return v;
        }
    }

    return storage.get("HD:Authorization")
}

axiosInstance.interceptors.request.use(
    config => {
        // 增加header

        let token = getToken();
        if (token) {
            config.headers['Authorization'] = token;
        }

        return config;
    }
);

axiosInstance.interceptors.response.use(res => {
    const {data, headers} = res;

    data._headers = headers
    return data;
})

/**
 *
 * @param msg
 * @param error 原始错误信息
 */

http.globalErrorMessageHandler = function (msg, error) {
    console.log('请求异常', msg, error)
    console.log('您可以使用 http.globalErrorMessageHandler 设置提示方式')
    alert(msg)
}

addErrorInterceptor()


function addErrorInterceptor() {
    const STATUS_MESSAGE = {
        200: '服务器成功返回请求的数据',
        201: '新增或修改数据成功',
        202: '一个请求已经进入后台排队（异步任务）',
        204: '删除数据成功',
        400: '发出的请求有错误，服务器没有进行新增或修改数据的操作',
        401: '请求需要登录',
        403: '权限不足',
        404: '接口未定义',
        406: '请求的格式不可得',
        410: '请求的资源被永久删除，且不会再得到的',
        422: '当创建一个对象时，发生一个验证错误',
        500: '服务器发生错误，请检查服务器',
        502: '网关错误',
        503: '服务不可用，服务器暂时过载或维护',
        504: '网关超时',
    };


    /**
     * axios 的错误代码
     * 来源 AxiosError.ERR_NETWORK
     * 直接使用的chatgpt 转换为js对象并翻译
     */
    const axiosInstance_CODE_MESSAGE = {
        ERR_FR_TOO_MANY_REDIRECTS: "错误：重定向过多",
        ERR_BAD_OPTION_VALUE: "错误：选项值无效",
        ERR_BAD_OPTION: "错误：无效选项",
        ERR_NETWORK: "错误：网络错误",
        ERR_DEPRECATED: "错误：已弃用",
        ERR_BAD_RESPONSE: "错误：响应错误",
        ERR_BAD_REQUEST: "错误：无效请求",
        ERR_NOT_SUPPORT: "错误：不支持",
        ERR_INVALID_URL: "错误：无效的URL",
        ERR_CANCELED: "错误：已取消",
        ECONNABORTED: "连接中止",
        ETIMEDOUT: "连接超时"
    }

    axiosInstance.interceptors.response.use(response => {
        let {success, message} = response; // 这里默认服务器返回的包含 success 和message 字段， 通常框架都有

        // 如果框架没有返回 success ，则不处理错误信息，因为无法判断是否成功
        if (success === undefined) {
            return response;
        }


        if (success) {
            // 数据正常，进行的逻辑功能
            return response
        } else {
            // 如果返回的 success 是 false，表明业务出错，直接触发 reject
            http.globalErrorMessageHandler(message || '服务器忙', response)
            // 抛出的错误，被 catch 捕获
            return Promise.reject(new Error(message))
        }
    }, error => {
        // 对响应错误做点什么

        let {message, code, response} = error;
        let msg = response ? STATUS_MESSAGE[response.status] : axiosInstance_CODE_MESSAGE[code];

        http.globalErrorMessageHandler(msg || message, error)

        return Promise.reject(error)
    })
}

http.setGlobalHeader = function (key, value){
    storage.set("HD:"+key,value)
}
http.getGlobalHeaders = function (){
    const result = {}
    let data = storage.data();
    for (let key in data) {
        const value = data[key];
        if(key.startsWith("HD:")){
            key = key.substring("HD:".length)
            result[key] = value
        }
    }
    return result;
}

http.get = function (url, params) {
    return axiosInstance.get(url, {params})
}

http.post = function (url, data, params =null) {
    return axiosInstance.post(url, data, {
        params
    })
}

http.postForm = function (url, data) {
    return axiosInstance.postForm(url, data)
}


http.downloadFile = function (url, params) {
    console.log('下载中...')

    let config = {
        url,
        params,
        responseType: 'blob',
    };
    return new Promise((resolve, reject) => {


        axiosInstance(config).then(data => {
            console.log('下载数据结束', data);

            const headers = data._headers

            // 获取文件名称
            var contentDisposition = headers.get('content-disposition');
            if (headers == null || contentDisposition == null) {
                showError('获取文件信息失败');
                reject(null)
                return
            }


            let regExp = new RegExp('filename=(.*)');
            // @ts-ignore
            const result = regExp.exec(contentDisposition);

            // @ts-ignore
            let filename = result[1];

            filename = decodeURIComponent(filename);
            filename = filename.replaceAll('"', '');
            filename = filename.replace(/^["](.*)["]$/g, '$1')


            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.style.display = 'none';

            link.href = url;
            link.download = decodeURI(filename); // 下载后文件名

            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link); // 下载完成移除元素
            window.URL.revokeObjectURL(url);
        })
    })

};