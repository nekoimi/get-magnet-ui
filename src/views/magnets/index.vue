<template>
	<div class="magnets-container layout-padding">
		<el-card shadow="hover" class="layout-padding-auto">
			<div class="magnets-search mb15">
				<el-input
					size="default"
					placeholder="请输入标题或编号"
					v-model="state.tableData.param.keyword"
					style="max-width: 180px"
					clearable
					@clear="getTableData"
				>
				</el-input>
				<el-select
					v-model="state.tableData.param.status"
					placeholder="状态"
					size="default"
					class="ml10"
					style="max-width: 120px"
					clearable
					@change="getTableData"
				>
					<el-option label="全部" :value="undefined"></el-option>
					<el-option v-for="item in state.statusOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
				</el-select>
				<el-button size="default" type="primary" class="ml10" @click="getTableData">
					<el-icon>
						<ele-Search />
					</el-icon>
					查询
				</el-button>
				<el-button size="default" type="success" class="ml10" @click="onOpenAddMagnet('add')">
					<el-icon>
						<ele-FolderAdd />
					</el-icon>
					新增磁力链接
				</el-button>
			</div>
			<el-table :data="state.tableData.data" v-loading="state.tableData.loading" style="width: 100%" @selection-change="handleSelectionChange">
				<el-table-column type="selection" width="55"></el-table-column>
				<el-table-column type="index" label="序号" width="60" />
				<el-table-column prop="number" label="编号" width="120" show-overflow-tooltip></el-table-column>
				<el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip></el-table-column>
				<el-table-column prop="actress0" label="女优" width="120" show-overflow-tooltip></el-table-column>
				<el-table-column prop="origin" label="来源" width="100" show-overflow-tooltip></el-table-column>
				<el-table-column prop="optimal_link" label="优选链接" min-width="150" show-overflow-tooltip>
					<template #default="scope">
						<el-link v-if="scope.row.optimal_link" type="primary" @click="onCopyOptimalLink(scope.row.optimal_link)">
							{{ scope.row.optimal_link }}
						</el-link>
					</template>
				</el-table-column>
				<el-table-column prop="status" label="状态" width="100" show-overflow-tooltip>
					<template #default="scope">
						<el-tag :type="getStatusTagType(scope.row.status)">{{ getStatusLabel(scope.row.status) }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="followed_by" label="任务 ID" min-width="160" show-overflow-tooltip></el-table-column>
				<el-table-column prop="download_retry_count" label="重试" width="70" show-overflow-tooltip></el-table-column>
				<el-table-column prop="last_submit_at" label="最后提交" width="180" show-overflow-tooltip></el-table-column>
				<el-table-column prop="download_completed_at" label="完成时间" width="180" show-overflow-tooltip></el-table-column>
				<el-table-column prop="download_error" label="错误" min-width="160" show-overflow-tooltip></el-table-column>
				<el-table-column prop="created_at" label="创建时间" width="180" show-overflow-tooltip></el-table-column>
				<el-table-column label="操作" width="240" fixed="right">
					<template #default="scope">
						<el-button
							v-if="scope.row.status === 0"
							size="small"
							text
							type="success"
							:loading="isActionLoading(scope.row.id)"
							@click="onSubmitDownload(scope.row)"
						>
							提交
						</el-button>
						<el-button
							v-if="scope.row.status === 4"
							size="small"
							text
							type="warning"
							:loading="isActionLoading(scope.row.id)"
							@click="onRetryDownload(scope.row)"
						>
							重试
						</el-button>
						<el-button size="small" text type="primary" @click="onOpenEditMagnet('edit', scope.row)">编辑</el-button>
						<el-button size="small" text type="danger" @click="onRowDel(scope.row)">删除</el-button>
					</template>
				</el-table-column>
			</el-table>
			<div class="mt15" v-if="selectedIds.length > 0">
				<el-button size="default" type="danger" @click="onBatchDelete">
					<el-icon>
						<ele-Delete />
					</el-icon>
					批量删除 ({{ selectedIds.length }})
				</el-button>
			</div>
			<el-pagination
				@size-change="onHandleSizeChange"
				@current-change="onHandleCurrentChange"
				class="mt15"
				:pager-count="5"
				:page-sizes="[10, 20, 30, 50, 100]"
				v-model:current-page="state.tableData.param.pageNum"
				background
				v-model:page-size="state.tableData.param.pageSize"
				layout="total, sizes, prev, pager, next, jumper"
				:total="state.tableData.total"
			>
			</el-pagination>
		</el-card>
		<MagnetDialog ref="magnetDialogRef" @refresh="getTableData()" />
	</div>
</template>

<script setup lang="ts" name="magnets">
import { defineAsyncComponent, reactive, onMounted, ref } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import { useMagnetApi } from '/@/api/magnet';
import { useDownloadApi } from '/@/api/download';
import commonFunction from '/@/utils/commonFunction';

// 引入组件
const MagnetDialog = defineAsyncComponent(() => import('/@/views/magnets/dialog.vue'));
const { copyText } = commonFunction();

type StatusOption = {
	label: string;
	value: number;
};

// 定义变量内容
const magnetDialogRef = ref();
const selectedIds = ref<number[]>([]);
const state = reactive<MagnetState>({
	statusOptions: [] as StatusOption[],
	actionLoadingIds: [] as number[],
	tableData: {
		data: [],
		total: 0,
		loading: false,
		param: {
			pageNum: 1,
			pageSize: 10,
			keyword: '',
			status: undefined as number | undefined,
		},
	},
});

const statusTagTypes: Record<number, 'success' | 'warning' | 'info' | 'primary' | 'danger'> = {
	0: 'info',
	1: 'warning',
	2: 'primary',
	3: 'success',
	4: 'danger',
};

const getStatusLabel = (status: number) => {
	return state.statusOptions.find((item) => item.value === status)?.label || '未知';
};

const getStatusTagType = (status: number) => {
	return statusTagTypes[status] || 'danger';
};

const isActionLoading = (id: number) => {
	return state.actionLoadingIds.includes(id);
};

const setActionLoading = (id: number, loading: boolean) => {
	if (loading) {
		if (!state.actionLoadingIds.includes(id)) state.actionLoadingIds.push(id);
		return;
	}
	state.actionLoadingIds = state.actionLoadingIds.filter((item) => item !== id);
};

const getStatusOptions = async () => {
	try {
		const api = useMagnetApi();
		const res = await api.statusOptions();
		state.statusOptions = res.data || [];
	} catch (error) {
		state.statusOptions = [
			{ label: '已采集', value: 0 },
			{ label: '提交中', value: 1 },
			{ label: '下载中', value: 2 },
			{ label: '已完成', value: 3 },
			{ label: '失败', value: 4 },
		];
	}
};

// 获取表格数据
const getTableData = async () => {
	state.tableData.loading = true;
	try {
		const api = useMagnetApi();
		const res = await api.list({
			page_num: state.tableData.param.pageNum,
			page_size: state.tableData.param.pageSize,
			keyword: state.tableData.param.keyword,
			status: state.tableData.param.status,
		});
		state.tableData.data = res.data.list || [];
		state.tableData.total = res.data.total || 0;
	} catch (error) {
		ElMessage.error('获取数据失败');
	} finally {
		state.tableData.loading = false;
	}
};

const handleSubmitResult = (data: any) => {
	const success = data?.success || 0;
	const failed = data?.failed || 0;
	if (failed > 0) {
		ElMessage.warning(`提交完成，成功 ${success} 条，失败 ${failed} 条`);
	} else {
		ElMessage.success(`提交成功 ${success} 条`);
	}
	getTableData();
};

const onSubmitDownload = async (row: MagnetType) => {
	setActionLoading(row.id, true);
	try {
		const api = useDownloadApi();
		const res = await api.submit({ ids: [row.id] });
		handleSubmitResult(res.data);
	} catch (error) {
		ElMessage.error('提交下载失败');
	} finally {
		setActionLoading(row.id, false);
	}
};

const onRetryDownload = async (row: MagnetType) => {
	setActionLoading(row.id, true);
	try {
		const api = useDownloadApi();
		const res = await api.retry({ ids: [row.id] });
		handleSubmitResult(res.data);
	} catch (error) {
		ElMessage.error('重试下载失败');
	} finally {
		setActionLoading(row.id, false);
	}
};

const onCopyOptimalLink = (link: string) => {
	copyText(link);
};

// 打开新增磁力链接弹窗
const onOpenAddMagnet = (type: string) => {
	magnetDialogRef.value.openDialog(type);
};

// 打开修改磁力链接弹窗
const onOpenEditMagnet = (type: string, row: MagnetType) => {
	magnetDialogRef.value.openDialog(type, row);
};

// 删除磁力链接
const onRowDel = (row: MagnetType) => {
	ElMessageBox.confirm(`此操作将永久删除编号为"${row.number}"的磁力链接，是否继续?`, '提示', {
		confirmButtonText: '确认',
		cancelButtonText: '取消',
		type: 'warning',
	})
		.then(async () => {
			try {
				const api = useMagnetApi();
				await api.delete({ ids: [row.id] });
				ElMessage.success('删除成功');
				getTableData();
			} catch (error) {
				ElMessage.error('删除失败');
			}
		})
		.catch(() => {});
};

// 批量删除
const onBatchDelete = () => {
	if (selectedIds.value.length === 0) {
		ElMessage.warning('请选择要删除的数据');
		return;
	}
	ElMessageBox.confirm(`此操作将永久删除选中的 ${selectedIds.value.length} 条数据，是否继续?`, '提示', {
		confirmButtonText: '确认',
		cancelButtonText: '取消',
		type: 'warning',
	})
		.then(async () => {
			try {
				const api = useMagnetApi();
				await api.delete({ ids: selectedIds.value });
				ElMessage.success('批量删除成功');
				selectedIds.value = [];
				getTableData();
			} catch (error) {
				ElMessage.error('批量删除失败');
			}
		})
		.catch(() => {});
};

// 表格选择变化
const handleSelectionChange = (selection: MagnetType[]) => {
	selectedIds.value = selection.map((item) => item.id);
};

// 分页改变
const onHandleSizeChange = (val: number) => {
	state.tableData.param.pageSize = val;
	getTableData();
};

// 分页改变
const onHandleCurrentChange = (val: number) => {
	state.tableData.param.pageNum = val;
	getTableData();
};

// 页面加载时
onMounted(() => {
	getStatusOptions();
	getTableData();
});
</script>

<style scoped lang="scss">
.magnets-container {
	:deep(.el-card__body) {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: auto;
		.el-table {
			flex: 1;
		}
	}
}
</style>
