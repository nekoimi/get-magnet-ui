import request from '/@/utils/request';

/**
 * 磁力链接 API 接口集合
 * @method list 获取磁力链接列表
 * @method detail 获取磁力链接详情
 * @method create 创建磁力链接
 * @method update 更新磁力链接
 * @method delete 删除磁力链接
 */
export function useMagnetApi() {
	return {
		list: (data: object) => {
			return request({
				url: '/api/v1/magnets/list',
				method: 'post',
				data,
			});
		},
		detail: (params: object) => {
			return request({
				url: '/api/v1/magnets/detail',
				method: 'get',
				params,
			});
		},
		create: (data: object) => {
			return request({
				url: '/api/v1/magnets/create',
				method: 'post',
				data,
			});
		},
		update: (data: object) => {
			return request({
				url: '/api/v1/magnets/update',
				method: 'post',
				data,
			});
		},
		delete: (data: object) => {
			return request({
				url: '/api/v1/magnets/delete',
				method: 'post',
				data,
			});
		},
	};
}